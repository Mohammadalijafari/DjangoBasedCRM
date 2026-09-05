import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./Deals.module.css";
import { PageHeader } from "../components/AppShell";
import { Button } from "../components/ui";
import { dealsApi, pipelinesApi } from "../api/resources";
import type { Deal } from "../types";
import { DealDrawer } from "./DealDrawer";

const money = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function Deals() {
  const queryClient = useQueryClient();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [openDeal, setOpenDeal] = useState<Deal | "new" | null>(null);
  const [newDealStage, setNewDealStage] = useState<string | null>(null);

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => pipelinesApi.list(),
  });
  const pipeline = useMemo(
    () => pipelines?.find((p) => p.is_default) ?? pipelines?.[0],
    [pipelines],
  );

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["deals", pipeline?.id],
    queryFn: () => dealsApi.list({ pipeline: pipeline!.id }),
    enabled: !!pipeline,
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      dealsApi.moveStage(dealId, stageId),
    onMutate: async ({ dealId, stageId }) => {
      const key = ["deals", pipeline?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Deal[]>(key);
      queryClient.setQueryData<Deal[]>(key, (old) =>
        old?.map((d) => (d.id === dealId ? { ...d, stage: stageId } : d)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["deals", pipeline?.id], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["deals", pipeline?.id] }),
  });

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const deal of deals ?? []) {
      const list = map.get(deal.stage) ?? [];
      list.push(deal);
      map.set(deal.stage, list);
    }
    return map;
  }, [deals]);

  if (pipelinesLoading) {
    return <div className={styles.emptyColumn}>Loading pipeline…</div>;
  }

  if (!pipeline) {
    return (
      <>
        <PageHeader title="Deals" subtitle="No pipeline configured yet" />
        <div style={{ padding: "0 32px" }}>
          <p>
            Your organization doesn't have a sales pipeline set up. Create one in the Django
            admin under Pipelines to get started.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle={pipeline.name}
        action={
          <Button
            onClick={() => {
              setNewDealStage(pipeline.stages[0]?.id ?? null);
              setOpenDeal("new");
            }}
          >
            New deal
          </Button>
        }
      />
      <div style={{ padding: "24px 32px", height: "calc(100vh - 100px)" }}>
        {dealsLoading ? (
          <p>Loading deals…</p>
        ) : (
          <div className={styles.board}>
            {pipeline.stages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((stage) => {
                const stageDeals = dealsByStage.get(stage.id) ?? [];
                const total = stageDeals.reduce((sum, d) => sum + Number(d.amount), 0);
                return (
                  <div className={styles.column} key={stage.id}>
                    <div className={styles.columnHeader}>
                      <span className={styles.columnName}>{stage.name}</span>
                      <span className={`${styles.columnTotal} num`}>
                        {stageDeals.length} · ${money.format(total)}
                      </span>
                    </div>
                    <div
                      className={`${styles.columnBody} ${dragOverStage === stage.id ? styles.columnBodyOver : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverStage(stage.id);
                      }}
                      onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverStage(null);
                        const dealId = e.dataTransfer.getData("text/deal-id");
                        const fromStage = e.dataTransfer.getData("text/from-stage");
                        if (dealId && fromStage !== stage.id) {
                          moveStageMutation.mutate({ dealId, stageId: stage.id });
                        }
                      }}
                    >
                      {stageDeals.length === 0 && (
                        <div className={styles.emptyColumn}>No deals here</div>
                      )}
                      {stageDeals.map((deal) => (
                        <div
                          key={deal.id}
                          className={styles.card}
                          draggable={!deal.is_closed}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/deal-id", deal.id);
                            e.dataTransfer.setData("text/from-stage", deal.stage);
                          }}
                          onClick={() => setOpenDeal(deal)}
                        >
                          <div className={styles.cardTitle}>{deal.title}</div>
                          <div className={styles.cardMeta}>
                            <span>{deal.expected_close_date ?? "No close date"}</span>
                            <span className={`${styles.cardAmount} num`}>
                              ${money.format(Number(deal.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={styles.newDealBtn}
                        onClick={() => {
                          setNewDealStage(stage.id);
                          setOpenDeal("new");
                        }}
                      >
                        + Add deal
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {openDeal === "new" && newDealStage && (
        <DealDrawer pipeline={pipeline} defaultStageId={newDealStage} onClose={() => setOpenDeal(null)} />
      )}
      {openDeal && openDeal !== "new" && (
        <DealDrawer
          pipeline={pipeline}
          defaultStageId={openDeal.stage}
          deal={openDeal}
          onClose={() => setOpenDeal(null)}
        />
      )}
    </>
  );
}
