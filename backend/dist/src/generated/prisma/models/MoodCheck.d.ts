import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace";
/**
 * Model MoodCheck
 *
 */
export type MoodCheckModel = runtime.Types.Result.DefaultSelection<Prisma.$MoodCheckPayload>;
export type AggregateMoodCheck = {
    _count: MoodCheckCountAggregateOutputType | null;
    _min: MoodCheckMinAggregateOutputType | null;
    _max: MoodCheckMaxAggregateOutputType | null;
};
export type MoodCheckMinAggregateOutputType = {
    id: string | null;
    userId: string | null;
    date: Date | null;
    mood: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type MoodCheckMaxAggregateOutputType = {
    id: string | null;
    userId: string | null;
    date: Date | null;
    mood: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};
export type MoodCheckCountAggregateOutputType = {
    id: number;
    userId: number;
    date: number;
    mood: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
};
export type MoodCheckMinAggregateInputType = {
    id?: true;
    userId?: true;
    date?: true;
    mood?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type MoodCheckMaxAggregateInputType = {
    id?: true;
    userId?: true;
    date?: true;
    mood?: true;
    createdAt?: true;
    updatedAt?: true;
};
export type MoodCheckCountAggregateInputType = {
    id?: true;
    userId?: true;
    date?: true;
    mood?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
};
export type MoodCheckAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which MoodCheck to aggregate.
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of MoodChecks to fetch.
     */
    orderBy?: Prisma.MoodCheckOrderByWithRelationInput | Prisma.MoodCheckOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: Prisma.MoodCheckWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` MoodChecks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` MoodChecks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned MoodChecks
    **/
    _count?: true | MoodCheckCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
    **/
    _min?: MoodCheckMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
    **/
    _max?: MoodCheckMaxAggregateInputType;
};
export type GetMoodCheckAggregateType<T extends MoodCheckAggregateArgs> = {
    [P in keyof T & keyof AggregateMoodCheck]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateMoodCheck[P]> : Prisma.GetScalarType<T[P], AggregateMoodCheck[P]>;
};
export type MoodCheckGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.MoodCheckWhereInput;
    orderBy?: Prisma.MoodCheckOrderByWithAggregationInput | Prisma.MoodCheckOrderByWithAggregationInput[];
    by: Prisma.MoodCheckScalarFieldEnum[] | Prisma.MoodCheckScalarFieldEnum;
    having?: Prisma.MoodCheckScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: MoodCheckCountAggregateInputType | true;
    _min?: MoodCheckMinAggregateInputType;
    _max?: MoodCheckMaxAggregateInputType;
};
export type MoodCheckGroupByOutputType = {
    id: string;
    userId: string;
    date: Date;
    mood: string;
    createdAt: Date;
    updatedAt: Date;
    _count: MoodCheckCountAggregateOutputType | null;
    _min: MoodCheckMinAggregateOutputType | null;
    _max: MoodCheckMaxAggregateOutputType | null;
};
export type GetMoodCheckGroupByPayload<T extends MoodCheckGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<MoodCheckGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof MoodCheckGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], MoodCheckGroupByOutputType[P]> : Prisma.GetScalarType<T[P], MoodCheckGroupByOutputType[P]>;
}>>;
export type MoodCheckWhereInput = {
    AND?: Prisma.MoodCheckWhereInput | Prisma.MoodCheckWhereInput[];
    OR?: Prisma.MoodCheckWhereInput[];
    NOT?: Prisma.MoodCheckWhereInput | Prisma.MoodCheckWhereInput[];
    id?: Prisma.StringFilter<"MoodCheck"> | string;
    userId?: Prisma.StringFilter<"MoodCheck"> | string;
    date?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    mood?: Prisma.StringFilter<"MoodCheck"> | string;
    createdAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
};
export type MoodCheckOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    date?: Prisma.SortOrder;
    mood?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
};
export type MoodCheckWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId_date?: Prisma.MoodCheckUserIdDateCompoundUniqueInput;
    AND?: Prisma.MoodCheckWhereInput | Prisma.MoodCheckWhereInput[];
    OR?: Prisma.MoodCheckWhereInput[];
    NOT?: Prisma.MoodCheckWhereInput | Prisma.MoodCheckWhereInput[];
    userId?: Prisma.StringFilter<"MoodCheck"> | string;
    date?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    mood?: Prisma.StringFilter<"MoodCheck"> | string;
    createdAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
}, "id" | "userId_date">;
export type MoodCheckOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    date?: Prisma.SortOrder;
    mood?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    _count?: Prisma.MoodCheckCountOrderByAggregateInput;
    _max?: Prisma.MoodCheckMaxOrderByAggregateInput;
    _min?: Prisma.MoodCheckMinOrderByAggregateInput;
};
export type MoodCheckScalarWhereWithAggregatesInput = {
    AND?: Prisma.MoodCheckScalarWhereWithAggregatesInput | Prisma.MoodCheckScalarWhereWithAggregatesInput[];
    OR?: Prisma.MoodCheckScalarWhereWithAggregatesInput[];
    NOT?: Prisma.MoodCheckScalarWhereWithAggregatesInput | Prisma.MoodCheckScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"MoodCheck"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"MoodCheck"> | string;
    date?: Prisma.DateTimeWithAggregatesFilter<"MoodCheck"> | Date | string;
    mood?: Prisma.StringWithAggregatesFilter<"MoodCheck"> | string;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"MoodCheck"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"MoodCheck"> | Date | string;
};
export type MoodCheckCreateInput = {
    id?: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMoodChecksInput;
};
export type MoodCheckUncheckedCreateInput = {
    id?: string;
    userId: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MoodCheckUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMoodChecksNestedInput;
};
export type MoodCheckUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckCreateManyInput = {
    id?: string;
    userId: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MoodCheckUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckListRelationFilter = {
    every?: Prisma.MoodCheckWhereInput;
    some?: Prisma.MoodCheckWhereInput;
    none?: Prisma.MoodCheckWhereInput;
};
export type MoodCheckOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type MoodCheckUserIdDateCompoundUniqueInput = {
    userId: string;
    date: Date | string;
};
export type MoodCheckCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    date?: Prisma.SortOrder;
    mood?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type MoodCheckMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    date?: Prisma.SortOrder;
    mood?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type MoodCheckMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    date?: Prisma.SortOrder;
    mood?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
};
export type MoodCheckCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput> | Prisma.MoodCheckCreateWithoutUserInput[] | Prisma.MoodCheckUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MoodCheckCreateOrConnectWithoutUserInput | Prisma.MoodCheckCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.MoodCheckCreateManyUserInputEnvelope;
    connect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
};
export type MoodCheckUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput> | Prisma.MoodCheckCreateWithoutUserInput[] | Prisma.MoodCheckUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MoodCheckCreateOrConnectWithoutUserInput | Prisma.MoodCheckCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.MoodCheckCreateManyUserInputEnvelope;
    connect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
};
export type MoodCheckUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput> | Prisma.MoodCheckCreateWithoutUserInput[] | Prisma.MoodCheckUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MoodCheckCreateOrConnectWithoutUserInput | Prisma.MoodCheckCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.MoodCheckUpsertWithWhereUniqueWithoutUserInput | Prisma.MoodCheckUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.MoodCheckCreateManyUserInputEnvelope;
    set?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    disconnect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    delete?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    connect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    update?: Prisma.MoodCheckUpdateWithWhereUniqueWithoutUserInput | Prisma.MoodCheckUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.MoodCheckUpdateManyWithWhereWithoutUserInput | Prisma.MoodCheckUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.MoodCheckScalarWhereInput | Prisma.MoodCheckScalarWhereInput[];
};
export type MoodCheckUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput> | Prisma.MoodCheckCreateWithoutUserInput[] | Prisma.MoodCheckUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MoodCheckCreateOrConnectWithoutUserInput | Prisma.MoodCheckCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.MoodCheckUpsertWithWhereUniqueWithoutUserInput | Prisma.MoodCheckUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.MoodCheckCreateManyUserInputEnvelope;
    set?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    disconnect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    delete?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    connect?: Prisma.MoodCheckWhereUniqueInput | Prisma.MoodCheckWhereUniqueInput[];
    update?: Prisma.MoodCheckUpdateWithWhereUniqueWithoutUserInput | Prisma.MoodCheckUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.MoodCheckUpdateManyWithWhereWithoutUserInput | Prisma.MoodCheckUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.MoodCheckScalarWhereInput | Prisma.MoodCheckScalarWhereInput[];
};
export type MoodCheckCreateWithoutUserInput = {
    id?: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MoodCheckUncheckedCreateWithoutUserInput = {
    id?: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MoodCheckCreateOrConnectWithoutUserInput = {
    where: Prisma.MoodCheckWhereUniqueInput;
    create: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput>;
};
export type MoodCheckCreateManyUserInputEnvelope = {
    data: Prisma.MoodCheckCreateManyUserInput | Prisma.MoodCheckCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type MoodCheckUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.MoodCheckWhereUniqueInput;
    update: Prisma.XOR<Prisma.MoodCheckUpdateWithoutUserInput, Prisma.MoodCheckUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.MoodCheckCreateWithoutUserInput, Prisma.MoodCheckUncheckedCreateWithoutUserInput>;
};
export type MoodCheckUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.MoodCheckWhereUniqueInput;
    data: Prisma.XOR<Prisma.MoodCheckUpdateWithoutUserInput, Prisma.MoodCheckUncheckedUpdateWithoutUserInput>;
};
export type MoodCheckUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.MoodCheckScalarWhereInput;
    data: Prisma.XOR<Prisma.MoodCheckUpdateManyMutationInput, Prisma.MoodCheckUncheckedUpdateManyWithoutUserInput>;
};
export type MoodCheckScalarWhereInput = {
    AND?: Prisma.MoodCheckScalarWhereInput | Prisma.MoodCheckScalarWhereInput[];
    OR?: Prisma.MoodCheckScalarWhereInput[];
    NOT?: Prisma.MoodCheckScalarWhereInput | Prisma.MoodCheckScalarWhereInput[];
    id?: Prisma.StringFilter<"MoodCheck"> | string;
    userId?: Prisma.StringFilter<"MoodCheck"> | string;
    date?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    mood?: Prisma.StringFilter<"MoodCheck"> | string;
    createdAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"MoodCheck"> | Date | string;
};
export type MoodCheckCreateManyUserInput = {
    id?: string;
    date: Date | string;
    mood: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MoodCheckUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    date?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mood?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MoodCheckSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    date?: boolean;
    mood?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["moodCheck"]>;
export type MoodCheckSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    date?: boolean;
    mood?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["moodCheck"]>;
export type MoodCheckSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    date?: boolean;
    mood?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["moodCheck"]>;
export type MoodCheckSelectScalar = {
    id?: boolean;
    userId?: boolean;
    date?: boolean;
    mood?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
};
export type MoodCheckOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "date" | "mood" | "createdAt" | "updatedAt", ExtArgs["result"]["moodCheck"]>;
export type MoodCheckInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type MoodCheckIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type MoodCheckIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $MoodCheckPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "MoodCheck";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        userId: string;
        date: Date;
        mood: string;
        createdAt: Date;
        updatedAt: Date;
    }, ExtArgs["result"]["moodCheck"]>;
    composites: {};
};
export type MoodCheckGetPayload<S extends boolean | null | undefined | MoodCheckDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload, S>;
export type MoodCheckCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<MoodCheckFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: MoodCheckCountAggregateInputType | true;
};
export interface MoodCheckDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['MoodCheck'];
        meta: {
            name: 'MoodCheck';
        };
    };
    /**
     * Find zero or one MoodCheck that matches the filter.
     * @param {MoodCheckFindUniqueArgs} args - Arguments to find a MoodCheck
     * @example
     * // Get one MoodCheck
     * const moodCheck = await prisma.moodCheck.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MoodCheckFindUniqueArgs>(args: Prisma.SelectSubset<T, MoodCheckFindUniqueArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find one MoodCheck that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {MoodCheckFindUniqueOrThrowArgs} args - Arguments to find a MoodCheck
     * @example
     * // Get one MoodCheck
     * const moodCheck = await prisma.moodCheck.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MoodCheckFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, MoodCheckFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first MoodCheck that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckFindFirstArgs} args - Arguments to find a MoodCheck
     * @example
     * // Get one MoodCheck
     * const moodCheck = await prisma.moodCheck.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MoodCheckFindFirstArgs>(args?: Prisma.SelectSubset<T, MoodCheckFindFirstArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    /**
     * Find the first MoodCheck that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckFindFirstOrThrowArgs} args - Arguments to find a MoodCheck
     * @example
     * // Get one MoodCheck
     * const moodCheck = await prisma.moodCheck.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MoodCheckFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, MoodCheckFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Find zero or more MoodChecks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MoodChecks
     * const moodChecks = await prisma.moodCheck.findMany()
     *
     * // Get first 10 MoodChecks
     * const moodChecks = await prisma.moodCheck.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const moodCheckWithIdOnly = await prisma.moodCheck.findMany({ select: { id: true } })
     *
     */
    findMany<T extends MoodCheckFindManyArgs>(args?: Prisma.SelectSubset<T, MoodCheckFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    /**
     * Create a MoodCheck.
     * @param {MoodCheckCreateArgs} args - Arguments to create a MoodCheck.
     * @example
     * // Create one MoodCheck
     * const MoodCheck = await prisma.moodCheck.create({
     *   data: {
     *     // ... data to create a MoodCheck
     *   }
     * })
     *
     */
    create<T extends MoodCheckCreateArgs>(args: Prisma.SelectSubset<T, MoodCheckCreateArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Create many MoodChecks.
     * @param {MoodCheckCreateManyArgs} args - Arguments to create many MoodChecks.
     * @example
     * // Create many MoodChecks
     * const moodCheck = await prisma.moodCheck.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends MoodCheckCreateManyArgs>(args?: Prisma.SelectSubset<T, MoodCheckCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Create many MoodChecks and returns the data saved in the database.
     * @param {MoodCheckCreateManyAndReturnArgs} args - Arguments to create many MoodChecks.
     * @example
     * // Create many MoodChecks
     * const moodCheck = await prisma.moodCheck.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many MoodChecks and only return the `id`
     * const moodCheckWithIdOnly = await prisma.moodCheck.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends MoodCheckCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, MoodCheckCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    /**
     * Delete a MoodCheck.
     * @param {MoodCheckDeleteArgs} args - Arguments to delete one MoodCheck.
     * @example
     * // Delete one MoodCheck
     * const MoodCheck = await prisma.moodCheck.delete({
     *   where: {
     *     // ... filter to delete one MoodCheck
     *   }
     * })
     *
     */
    delete<T extends MoodCheckDeleteArgs>(args: Prisma.SelectSubset<T, MoodCheckDeleteArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Update one MoodCheck.
     * @param {MoodCheckUpdateArgs} args - Arguments to update one MoodCheck.
     * @example
     * // Update one MoodCheck
     * const moodCheck = await prisma.moodCheck.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends MoodCheckUpdateArgs>(args: Prisma.SelectSubset<T, MoodCheckUpdateArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Delete zero or more MoodChecks.
     * @param {MoodCheckDeleteManyArgs} args - Arguments to filter MoodChecks to delete.
     * @example
     * // Delete a few MoodChecks
     * const { count } = await prisma.moodCheck.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends MoodCheckDeleteManyArgs>(args?: Prisma.SelectSubset<T, MoodCheckDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more MoodChecks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MoodChecks
     * const moodCheck = await prisma.moodCheck.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends MoodCheckUpdateManyArgs>(args: Prisma.SelectSubset<T, MoodCheckUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    /**
     * Update zero or more MoodChecks and returns the data updated in the database.
     * @param {MoodCheckUpdateManyAndReturnArgs} args - Arguments to update many MoodChecks.
     * @example
     * // Update many MoodChecks
     * const moodCheck = await prisma.moodCheck.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Update zero or more MoodChecks and only return the `id`
     * const moodCheckWithIdOnly = await prisma.moodCheck.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    updateManyAndReturn<T extends MoodCheckUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, MoodCheckUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    /**
     * Create or update one MoodCheck.
     * @param {MoodCheckUpsertArgs} args - Arguments to update or create a MoodCheck.
     * @example
     * // Update or create a MoodCheck
     * const moodCheck = await prisma.moodCheck.upsert({
     *   create: {
     *     // ... data to create a MoodCheck
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MoodCheck we want to update
     *   }
     * })
     */
    upsert<T extends MoodCheckUpsertArgs>(args: Prisma.SelectSubset<T, MoodCheckUpsertArgs<ExtArgs>>): Prisma.Prisma__MoodCheckClient<runtime.Types.Result.GetResult<Prisma.$MoodCheckPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    /**
     * Count the number of MoodChecks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckCountArgs} args - Arguments to filter MoodChecks to count.
     * @example
     * // Count the number of MoodChecks
     * const count = await prisma.moodCheck.count({
     *   where: {
     *     // ... the filter for the MoodChecks we want to count
     *   }
     * })
    **/
    count<T extends MoodCheckCountArgs>(args?: Prisma.Subset<T, MoodCheckCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], MoodCheckCountAggregateOutputType> : number>;
    /**
     * Allows you to perform aggregations operations on a MoodCheck.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MoodCheckAggregateArgs>(args: Prisma.Subset<T, MoodCheckAggregateArgs>): Prisma.PrismaPromise<GetMoodCheckAggregateType<T>>;
    /**
     * Group by MoodCheck.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoodCheckGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
    **/
    groupBy<T extends MoodCheckGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: MoodCheckGroupByArgs['orderBy'];
    } : {
        orderBy?: MoodCheckGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, MoodCheckGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMoodCheckGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the MoodCheck model
     */
    readonly fields: MoodCheckFieldRefs;
}
/**
 * The delegate class that acts as a "Promise-like" for MoodCheck.
 * Why is this prefixed with `Prisma__`?
 * Because we want to prevent naming conflicts as mentioned in
 * https://github.com/prisma/prisma-client-js/issues/707
 */
export interface Prisma__MoodCheckClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
/**
 * Fields of the MoodCheck model
 */
export interface MoodCheckFieldRefs {
    readonly id: Prisma.FieldRef<"MoodCheck", 'String'>;
    readonly userId: Prisma.FieldRef<"MoodCheck", 'String'>;
    readonly date: Prisma.FieldRef<"MoodCheck", 'DateTime'>;
    readonly mood: Prisma.FieldRef<"MoodCheck", 'String'>;
    readonly createdAt: Prisma.FieldRef<"MoodCheck", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"MoodCheck", 'DateTime'>;
}
/**
 * MoodCheck findUnique
 */
export type MoodCheckFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter, which MoodCheck to fetch.
     */
    where: Prisma.MoodCheckWhereUniqueInput;
};
/**
 * MoodCheck findUniqueOrThrow
 */
export type MoodCheckFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter, which MoodCheck to fetch.
     */
    where: Prisma.MoodCheckWhereUniqueInput;
};
/**
 * MoodCheck findFirst
 */
export type MoodCheckFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter, which MoodCheck to fetch.
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of MoodChecks to fetch.
     */
    orderBy?: Prisma.MoodCheckOrderByWithRelationInput | Prisma.MoodCheckOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for MoodChecks.
     */
    cursor?: Prisma.MoodCheckWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` MoodChecks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` MoodChecks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of MoodChecks.
     */
    distinct?: Prisma.MoodCheckScalarFieldEnum | Prisma.MoodCheckScalarFieldEnum[];
};
/**
 * MoodCheck findFirstOrThrow
 */
export type MoodCheckFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter, which MoodCheck to fetch.
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of MoodChecks to fetch.
     */
    orderBy?: Prisma.MoodCheckOrderByWithRelationInput | Prisma.MoodCheckOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for MoodChecks.
     */
    cursor?: Prisma.MoodCheckWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` MoodChecks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` MoodChecks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of MoodChecks.
     */
    distinct?: Prisma.MoodCheckScalarFieldEnum | Prisma.MoodCheckScalarFieldEnum[];
};
/**
 * MoodCheck findMany
 */
export type MoodCheckFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter, which MoodChecks to fetch.
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of MoodChecks to fetch.
     */
    orderBy?: Prisma.MoodCheckOrderByWithRelationInput | Prisma.MoodCheckOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing MoodChecks.
     */
    cursor?: Prisma.MoodCheckWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` MoodChecks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` MoodChecks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of MoodChecks.
     */
    distinct?: Prisma.MoodCheckScalarFieldEnum | Prisma.MoodCheckScalarFieldEnum[];
};
/**
 * MoodCheck create
 */
export type MoodCheckCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * The data needed to create a MoodCheck.
     */
    data: Prisma.XOR<Prisma.MoodCheckCreateInput, Prisma.MoodCheckUncheckedCreateInput>;
};
/**
 * MoodCheck createMany
 */
export type MoodCheckCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to create many MoodChecks.
     */
    data: Prisma.MoodCheckCreateManyInput | Prisma.MoodCheckCreateManyInput[];
    skipDuplicates?: boolean;
};
/**
 * MoodCheck createManyAndReturn
 */
export type MoodCheckCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * The data used to create many MoodChecks.
     */
    data: Prisma.MoodCheckCreateManyInput | Prisma.MoodCheckCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckIncludeCreateManyAndReturn<ExtArgs> | null;
};
/**
 * MoodCheck update
 */
export type MoodCheckUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * The data needed to update a MoodCheck.
     */
    data: Prisma.XOR<Prisma.MoodCheckUpdateInput, Prisma.MoodCheckUncheckedUpdateInput>;
    /**
     * Choose, which MoodCheck to update.
     */
    where: Prisma.MoodCheckWhereUniqueInput;
};
/**
 * MoodCheck updateMany
 */
export type MoodCheckUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * The data used to update MoodChecks.
     */
    data: Prisma.XOR<Prisma.MoodCheckUpdateManyMutationInput, Prisma.MoodCheckUncheckedUpdateManyInput>;
    /**
     * Filter which MoodChecks to update
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * Limit how many MoodChecks to update.
     */
    limit?: number;
};
/**
 * MoodCheck updateManyAndReturn
 */
export type MoodCheckUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelectUpdateManyAndReturn<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * The data used to update MoodChecks.
     */
    data: Prisma.XOR<Prisma.MoodCheckUpdateManyMutationInput, Prisma.MoodCheckUncheckedUpdateManyInput>;
    /**
     * Filter which MoodChecks to update
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * Limit how many MoodChecks to update.
     */
    limit?: number;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckIncludeUpdateManyAndReturn<ExtArgs> | null;
};
/**
 * MoodCheck upsert
 */
export type MoodCheckUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * The filter to search for the MoodCheck to update in case it exists.
     */
    where: Prisma.MoodCheckWhereUniqueInput;
    /**
     * In case the MoodCheck found by the `where` argument doesn't exist, create a new MoodCheck with this data.
     */
    create: Prisma.XOR<Prisma.MoodCheckCreateInput, Prisma.MoodCheckUncheckedCreateInput>;
    /**
     * In case the MoodCheck was found with the provided `where` argument, update it with this data.
     */
    update: Prisma.XOR<Prisma.MoodCheckUpdateInput, Prisma.MoodCheckUncheckedUpdateInput>;
};
/**
 * MoodCheck delete
 */
export type MoodCheckDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
    /**
     * Filter which MoodCheck to delete.
     */
    where: Prisma.MoodCheckWhereUniqueInput;
};
/**
 * MoodCheck deleteMany
 */
export type MoodCheckDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Filter which MoodChecks to delete
     */
    where?: Prisma.MoodCheckWhereInput;
    /**
     * Limit how many MoodChecks to delete.
     */
    limit?: number;
};
/**
 * MoodCheck without action
 */
export type MoodCheckDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoodCheck
     */
    select?: Prisma.MoodCheckSelect<ExtArgs> | null;
    /**
     * Omit specific fields from the MoodCheck
     */
    omit?: Prisma.MoodCheckOmit<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Prisma.MoodCheckInclude<ExtArgs> | null;
};
//# sourceMappingURL=MoodCheck.d.ts.map