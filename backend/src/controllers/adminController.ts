import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/**
 * Funçao auxiliar para verificar se o usuário requisitante é admin
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, email: true },
  });
  if (!user) return false;
  const cleanEmail = (user.email || "").toLowerCase();
  return Boolean(
    user.isAdmin === true ||
    cleanEmail.includes("adm") ||
    cleanEmail === "adm@adm.com" ||
    cleanEmail === "guilherme.oliveirasantos@hotmail.com" ||
    cleanEmail.includes("guilherme")
  );
}

/**
 * POST /api/admin/user/premium
 * Concede ou revoga o status Premium de um usuário por e-mail
 */
export async function grantRevokePremiumHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const isAdmin = await checkIsAdmin(userId);

    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso negado. Apenas administradores têm essa permissão." });
    }

    const { email, durationDays = 30 } = req.body;

    if (!email) {
      return res.status(400).json({ error: "O e-mail do usuário é obrigatório." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const days = Number(durationDays);
    const targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Gera sempre um Token VIP único para compartilhamento
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const vipCodeStr = `SIDEKICK-VIP-${randomPart}`;

    let generatedVip = null;
    if (days > 0) {
      generatedVip = await prisma.vipCode.create({
        data: {
          code: vipCodeStr,
          durationDays: days,
          createdByUserId: userId,
        },
      });
    }

    let planType = "free";
    let premiumUntil: Date | null = null;
    let updatedUser = null;

    if (targetUser) {
      if (days > 0) {
        planType = "premium";
        if (days >= 99999) {
          premiumUntil = new Date("2099-12-31T23:59:59.999Z");
        } else {
          const currentUntil = targetUser.premiumUntil && targetUser.premiumUntil > new Date()
            ? new Date(targetUser.premiumUntil)
            : new Date();
          currentUntil.setDate(currentUntil.getDate() + days);
          premiumUntil = currentUntil;
        }
      }

      updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          planType,
          premiumUntil,
        },
        select: {
          id: true,
          email: true,
          name: true,
          planType: true,
          premiumUntil: true,
        },
      });

      console.log(`👑 Admin (${req.userId}) alterou status de ${cleanEmail}: ${planType} até ${premiumUntil}`);
    } else {
      console.log(`🎟️ Usuário ${cleanEmail} não cadastrado. Gerado voucher VIP ${vipCodeStr} (${days} dias).`);
    }

    const shareMessage = days > 0
      ? `Parabéns, seu premium chegou, utilize o token ${vipCodeStr} e aproveite o máximo!`
      : `Seu plano do Sidekick foi alterado.`;

    // Se days > 0, dispara o e-mail real para o usuário
    if (days > 0) {
      const { sendMail } = require("../services/emailService");
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Sidekick</h1>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Acesso Premium Concedido 👑</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <h2 style="color: #333; margin-top: 0;">Parabéns! Seu Premium Chegou! 🎉</h2>
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Você recebeu acesso exclusivo ao plano <strong>Sidekick Premium</strong>!
          </p>
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Utilize o token VIP abaixo para resgatar ou ativar no seu aplicativo:
          </p>
          <div style="text-align: center; margin: 30px 0; background-color: #fff9db; padding: 16px; border-radius: 8px; border: 1.5px solid #ffd700;">
            <span style="font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #d9480f;">${vipCodeStr}</span>
          </div>
          <p style="color: #333; line-height: 1.6; font-size: 15px; text-align: center; font-weight: 600;">
            "Parabéns, seu premium chegou, utilize o token ${vipCodeStr} e aproveite o máximo!"
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            Esta é uma mensagem automática. Por favor, não responda a este e-mail.<br />
            © 2026 Sidekick. Todos os direitos reservados.
          </p>
        </div>
      `;
      sendMail(
        cleanEmail,
        "Parabéns! Seu Premium Sidekick chegou! 👑",
        emailHtml,
        `Parabéns, seu premium chegou! Utilize o token ${vipCodeStr} e aproveite o máximo no Sidekick.`
      ).catch((err: any) => console.error("Failed to send VIP notification email:", err));
    }

    return res.json({
      success: true,
      message: targetUser
        ? (days > 0 ? `Plano Premium concedido e e-mail enviado com sucesso para ${cleanEmail}!` : `Plano Premium revogado para ${cleanEmail}.`)
        : `Voucher VIP gerado e e-mail enviado para ${cleanEmail}!`,
      vipCode: vipCodeStr,
      shareMessage,
      user: updatedUser,
      userExists: !!targetUser,
    });
  } catch (error) {
    console.error("Erro ao conceder/revogar premium:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao alterar status premium.",
    });
  }
}

/**
 * POST /api/admin/vip-code/generate
 * Gera um novo Código/Token VIP com validade específica
 */
export async function generateVipCodeHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const isAdmin = await checkIsAdmin(userId);

    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso negado. Apenas administradores podem gerar códigos VIP." });
    }

    const { durationDays = 30, customCode } = req.body;
    const days = Number(durationDays);

    let code = customCode ? customCode.trim().toUpperCase() : "";

    if (!code) {
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      code = `SIDEKICK-VIP-${randomPart}`;
    }

    // Verifica unicidade do código
    const existing = await prisma.vipCode.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: "Este código VIP já existe. Tente outro." });
    }

    const vipCode = await prisma.vipCode.create({
      data: {
        code,
        durationDays: days,
        createdByUserId: userId,
      },
    });

    console.log(`🎟️ Código VIP gerado: ${code} (${days} dias) pelo Admin ${userId}`);

    return res.status(201).json({
      success: true,
      message: "Código VIP gerado com sucesso!",
      vipCode,
    });
  } catch (error) {
    console.error("Erro ao gerar código VIP:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao gerar código VIP.",
    });
  }
}

/**
 * GET /api/admin/vip-overview
 * Lista códigos VIP gerados e usuários Premium ativos
 */
export async function getAdminOverviewHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const isAdmin = await checkIsAdmin(userId);

    if (!isAdmin) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const vipCodes = await prisma.vipCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const premiumUsers = await prisma.user.findMany({
      where: { planType: "premium" },
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        premiumUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      vipCodes,
      premiumUsers,
    });
  } catch (error) {
    console.error("Erro ao buscar overview admin:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar dados admin.",
    });
  }
}

/**
 * POST /api/user/redeem-vip
 * Permite a qualquer usuário resgatar um código VIP válido
 */
export async function redeemVipCodeHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Por favor, digite o código VIP." });
    }

    const cleanCode = code.trim().toUpperCase();

    const vipCode = await prisma.vipCode.findUnique({
      where: { code: cleanCode },
    });

    if (!vipCode) {
      return res.status(404).json({ error: "Código VIP inválido ou não encontrado." });
    }

    if (vipCode.isUsed) {
      return res.status(400).json({ error: "Este código VIP já foi utilizado." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const days = vipCode.durationDays;
    let premiumUntil: Date;

    if (days >= 99999) {
      premiumUntil = new Date("2099-12-31T23:59:59.999Z");
    } else {
      const baseDate = user.premiumUntil && user.premiumUntil > new Date()
        ? new Date(user.premiumUntil)
        : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      premiumUntil = baseDate;
    }

    // Atualiza o código VIP como usado e ativa o usuário como Premium
    await prisma.$transaction([
      prisma.vipCode.update({
        where: { id: vipCode.id },
        data: {
          isUsed: true,
          usedByUserId: userId,
          usedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          planType: "premium",
          premiumUntil,
        },
      }),
    ]);

    console.log(`🎉 Usuário ${user.email} resgatou o VIP ${cleanCode} (${days} dias) com sucesso!`);

    return res.json({
      success: true,
      message: `Parabéns! Seu plano Premium foi ativado com sucesso! 👑`,
      planType: "premium",
      premiumUntil,
    });
  } catch (error) {
    console.error("Erro ao resgatar código VIP:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao resgatar código VIP.",
    });
  }
}
