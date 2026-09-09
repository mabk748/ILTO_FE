import { useState } from "react";
import type { SpacedRepetitionCard } from "@/lib/api/types.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Eye, CheckCircle } from "lucide-react";

interface Props {
  cards: SpacedRepetitionCard[];
}

export default function ReviewQueue({ cards: initialCards }: Props) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  const dueCards = initialCards.filter(
    (c) => new Date(c.next_review) <= new Date(),
  );
  const reviewedCount = Object.values(reviewed).filter(Boolean).length;

  if (dueCards.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
          <p className="text-lg font-semibold mb-1">All caught up!</p>
          <p className="text-sm">No cards due for review today.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          <span className="text-foreground font-semibold">
            {dueCards.length}
          </span>{" "}
          cards due
        </span>
        <span>·</span>
        <span>
          <span className="text-foreground font-semibold">{reviewedCount}</span>{" "}
          reviewed today
        </span>
      </div>

      <div className="space-y-3">
        {dueCards.map((card) => {
          const isRevealed = revealed[card.id];
          const isDone = reviewed[card.id];

          return (
            <Card key={card.id} className={isDone ? "opacity-50" : ""}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {card.topic}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {card.times_reviewed}× reviewed
                  </span>
                </div>

                <p className="text-sm font-medium">{card.question}</p>

                {!isRevealed && !isDone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRevealed((prev) => ({ ...prev, [card.id]: true }))
                    }
                    className="gap-2 cursor-pointer"
                  >
                    <Eye className="h-3 w-3" /> Reveal answer
                  </Button>
                )}

                {(isRevealed || isDone) && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      {card.answer}
                    </p>
                  </div>
                )}

                {isRevealed && !isDone && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setReviewed((prev) => ({ ...prev, [card.id]: true }))
                    }
                    className="gap-2 cursor-pointer"
                  >
                    <CheckCircle className="h-3 w-3" /> Mark reviewed
                  </Button>
                )}

                {isDone && (
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <CheckCircle className="h-3 w-3" /> Reviewed
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
