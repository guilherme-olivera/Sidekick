import { Request, Response } from "express";
import crypto from "crypto";
import { prisma, ensureDatabaseSchema } from "../utils/prisma";
import { checkIsAdminUser } from "../utils/adminAuth";
import { sendExpoPushNotifications } from "../services/pushNotificationService";

function generateSecureVipCode(): string {
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SIDEKICK-VIP-${randomPart}`;
}

/**
 * POST /api/admin/user/premium
 * Concede ou revoga o status Premium de um usuário por e-mail
 * - Se o usuário já existe no banco: ativa/estende (ou revoga) diretamente sem gerar voucher duplicado
 * - Se o usuário ainda não tem conta: gera um código VIP único e envia o convite por e-mail
 */
export async function grantRevokePremiumHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const isAdmin = await checkIsAdminUser(userId);

    if (!isAdmin) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores têm essa permissão.",
      });
    }

    const { email, durationDays = 30 } = req.body;

    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ error: "O e-mail do usuário é obrigatório." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const days = Number(durationDays);
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // CASO 1: Usuário já possui conta cadastrada -> Ativação/Revogação Direta na Conta
    if (targetUser) {
      let planType = "free";
      let premiumUntil: Date | null = null;

      if (days > 0) {
        planType = "premium";
        if (days >= 99999) {
          premiumUntil = new Date("2099-12-31T23:59:59.999Z");
        } else {
          const currentUntil =
            targetUser.premiumUntil && targetUser.premiumUntil > new Date()
              ? new Date(targetUser.premiumUntil)
              : new Date();
          currentUntil.setDate(currentUntil.getDate() + days);
          premiumUntil = currentUntil;
        }
      }

      const updatedUser = await prisma.user.update({
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

      const periodLabel =
        days >= 99999
          ? "Vitalício (Lifetime)"
          : `${days} dias (até ${premiumUntil?.toLocaleDateString("pt-BR")})`;

      if (days > 0) {
        await ensureDatabaseSchema();
        // Cria notificação In-App persistente no sininho do usuário
        await prisma.appNotification
          .create({
            data: {
              userId: targetUser.id,
              title: "👑 Seu Sidekick Premium está Ativo!",
              body: `Parabéns! Seu acesso Premium (${periodLabel}) foi ativado diretamente na sua conta. Aproveite 15 análises de IA por dia e relatórios semanais!`,
              icon: "👑",
              type: "premium",
            },
          })
          .catch((err) =>
            console.error("Failed to create premium AppNotification:", err)
          );

        // Envia Push Notification se o usuário tiver pushToken salvo
        if (targetUser.pushToken) {
          sendExpoPushNotifications(
            [targetUser.pushToken],
            "👑 Seu Sidekick Premium está Ativo!",
            `Seu plano Premium (${periodLabel}) já está liberado na sua conta Sidekick!`,
            { type: "premium_activated" }
          ).catch((err) =>
            console.error("Failed to send premium push notification:", err)
          );
        }

        // Envia e-mail informando que o plano já está ativo (sem precisar digitar código)
        const { sendMail } = require("../services/emailService");
        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Sidekick</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Acesso Premium Ativado na Conta 👑</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <h2 style="color: #333; margin-top: 0;">Parabéns, ${targetUser.name || "Atleta"}! Seu Premium está Ativo! 🎉</h2>
            <p style="color: #555; line-height: 1.6; font-size: 16px;">
              Seu plano <strong>Sidekick Premium</strong> foi ativado diretamente na sua conta (<strong>${cleanEmail}</strong>).
            </p>
            <div style="text-align: center; margin: 25px 0; background-color: #fff9db; padding: 16px; border-radius: 8px; border: 1.5px solid #ffd700;">
              <span style="font-size: 20px; font-weight: bold; color: #d9480f;">👑 PLANO PREMIUM ATIVO • ${periodLabel}</span>
            </div>
            <p style="color: #555; line-height: 1.6; font-size: 15px;">
              Não é necessário digitar nenhum código: basta abrir o aplicativo Sidekick para aproveitar até <strong>15 análises de IA por dia</strong>, relatórios semanais de evolução e suporte completo ao seu treinamento!
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2026 Sidekick. Todos os direitos reservados.
            </p>
          </div>
        `;
        sendMail(
          cleanEmail,
          "👑 Seu Sidekick Premium já está ativo!",
          emailHtml,
          `Parabéns! Seu plano Sidekick Premium (${periodLabel}) foi ativado diretamente na sua conta.`
        ).catch((err: any) =>
          console.error("Failed to send direct premium activation email:", err)
        );
      } else {
        await prisma.appNotification
          .create({
            data: {
              userId: targetUser.id,
              title: "ℹ️ Atualização do seu Plano",
              body: "Seu plano Sidekick retornou para a modalidade Gratuita (Free).",
              icon: "ℹ️",
              type: "system",
            },
          })
          .catch(() => {});
      }

      console.log(
        `👑 Admin (${userId}) alterou diretamente a conta ${cleanEmail}: ${planType} até ${premiumUntil}`
      );

      const directShareMessage =
        days > 0
          ? `Parabéns! Seu plano Sidekick Premium (${periodLabel}) já foi ativado diretamente na sua conta (${cleanEmail}). Basta abrir o app e aproveitar! 👑🚀`
          : `Seu plano no Sidekick foi atualizado para o plano Gratuito.`;

      return res.json({
        success: true,
        mode: days > 0 ? "DIRECT_ACTIVATION" : "REVOKED",
        message:
          days > 0
            ? `Plano Premium ativado diretamente na conta de ${targetUser.name || cleanEmail} (${periodLabel})! Notificação no app e e-mail enviados.`
            : `Plano Premium revogado para ${cleanEmail}.`,
        vipCode: null,
        shareMessage: directShareMessage,
        user: updatedUser,
        userExists: true,
      });
    }

    // CASO 2: E-mail ainda não possui conta no app -> Se days === 0, retorna aviso
    if (days <= 0) {
      return res.status(404).json({
        error: `Nenhuma conta encontrada com o e-mail ${cleanEmail} para revogar.`,
      });
    }

    // Se days > 0 e o usuário ainda não tem conta, gera um Voucher VIP para que ele resgate quando criar a conta
    const vipCodeStr = generateSecureVipCode();
    await prisma.vipCode.create({
      data: {
        code: vipCodeStr,
        durationDays: days,
        createdByUserId: userId,
      },
    });

    console.log(
      `🎟️ E-mail ${cleanEmail} ainda não possui conta. Gerado voucher VIP ${vipCodeStr} (${days} dias).`
    );

    const shareMessage = `Parabéns! Seu convite Sidekick Premium chegou! Crie sua conta e resgate o código VIP ${vipCodeStr} na aba Perfil para liberar ${days >= 99999 ? "acesso vitalício" : `${days} dias de Premium`}! 👑`;

    const { sendMail } = require("../services/emailService");
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ff6b6b; margin: 0; font-size: 28px;">Sidekick</h1>
          <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Convite VIP Sidekick Premium 👑</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <h2 style="color: #333; margin-top: 0;">Parabéns! Seu Voucher VIP Chegou! 🎉</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          Você recebeu um voucher exclusivo para ativar o <strong>Sidekick Premium</strong>!
        </p>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          No aplicativo Sidekick, acesse a aba <strong>Perfil &gt; Resgatar Código VIP</strong> e digite o código abaixo:
        </p>
        <div style="text-align: center; margin: 30px 0; background-color: #fff9db; padding: 16px; border-radius: 8px; border: 1.5px solid #ffd700;">
          <span style="font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #d9480f;">${vipCodeStr}</span>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2026 Sidekick. Todos os direitos reservados.
        </p>
      </div>
    `;
    sendMail(
      cleanEmail,
      "🎟️ Seu Código VIP Sidekick Premium chegou!",
      emailHtml,
      shareMessage
    ).catch((err: any) =>
      console.error("Failed to send VIP voucher email:", err)
    );

    return res.json({
      success: true,
      mode: "VOUCHER_GENERATED",
      message: `O e-mail ${cleanEmail} ainda não possui conta no app. Geramos e enviamos por e-mail o código VIP ${vipCodeStr}!`,
      vipCode: vipCodeStr,
      shareMessage,
      user: null,
      userExists: false,
    });
  } catch (error) {
    console.error("Erro ao conceder/revogar premium:", error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao alterar status premium.",
    });
  }
}

/**
 * POST /api/admin/vip-code/generate
 * Gera um novo Código/Token VIP avulso com validade específica
 */
export async function generateVipCodeHandler(req: any, res: Response) {
  try {
    const userId = req.userId;
    const isAdmin = await checkIsAdminUser(userId);

    if (!isAdmin) {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem gerar códigos VIP.",
      });
    }

    const { durationDays = 30, customCode } = req.body;
    const days = Number(durationDays);

    let code = customCode ? String(customCode).trim().toUpperCase() : "";

    if (!code) {
      code = generateSecureVipCode();
    }

    // Verifica unicidade do código
    const existing = await prisma.vipCode.findUnique({ where: { code } });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Este código VIP já existe. Tente outro." });
    }

    const vipCode = await prisma.vipCode.create({
      data: {
        code,
        durationDays: days,
        createdByUserId: userId,
      },
    });

    console.log(
      `🎟️ Código VIP gerado: ${code} (${days} dias) pelo Admin ${userId}`
    );

    return res.status(201).json({
      success: true,
      message: "Código VIP gerado com sucesso!",
      vipCode,
    });
  } catch (error) {
    console.error("Erro ao gerar código VIP:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao gerar código VIP.",
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
    const isAdmin = await checkIsAdminUser(userId);

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
      error:
        error instanceof Error
          ? error.message
          : "Erro ao carregar dados admin.",
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

    if (!code || typeof code !== "string") {
      return res
        .status(400)
        .json({ error: "Por favor, digite o código VIP." });
    }

    const cleanCode = code.trim().toUpperCase();

    const vipCode = await prisma.vipCode.findUnique({
      where: { code: cleanCode },
    });

    if (!vipCode) {
      return res
        .status(404)
        .json({ error: "Código VIP inválido ou não encontrado." });
    }

    if (vipCode.isUsed) {
      return res
        .status(400)
        .json({ error: "Este código VIP já foi utilizado." });
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
      const baseDate =
        user.premiumUntil && user.premiumUntil > new Date()
          ? new Date(user.premiumUntil)
          : new Date();
      baseDate.setDate(baseDate.getDate() + days);
      premiumUntil = baseDate;
    }

    const periodLabel =
      days >= 99999
        ? "Vitalício"
        : `${days} dias (até ${premiumUntil.toLocaleDateString("pt-BR")})`;

    // Atualiza o código VIP como usado, ativa o usuário como Premium e cria notificação In-App
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
      prisma.appNotification.create({
        data: {
          userId,
          title: "👑 Voucher VIP Resgatado!",
          body: `Parabéns! Você ativou o código ${cleanCode} e liberou o Sidekick Premium (${periodLabel}). Aproveite!`,
          icon: "👑",
          type: "premium",
        },
      }),
    ]);

    console.log(
      `🎉 Usuário ${user.email} resgatou o VIP ${cleanCode} (${days} dias) com sucesso!`
    );

    return res.json({
      success: true,
      message: `Parabéns! Seu plano Premium (${periodLabel}) foi ativado com sucesso! 👑`,
      planType: "premium",
      premiumUntil,
      durationDays: days,
    });
  } catch (error) {
    console.error("Erro ao resgatar código VIP:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao resgatar código VIP.",
    });
  }
}
