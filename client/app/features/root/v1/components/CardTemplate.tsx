"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { ReactNode, useState } from "react";

export const CardTemplate = ({
  title,
  description,
  refresh,
  isRefreshing,
  children,
}: {
  title: string;
  description: string;
  refresh?: () => void;
  isRefreshing?: boolean;
  children: ReactNode;
}) => {
  const [localIsRefreshing, setLocalIsRefreshing] = useState(false);

  const hasHeader = Boolean(title || description || refresh);
  return (
    <Card>
      {hasHeader && (
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate">
                {title}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm whitespace-normal wrap-break-word">
                {description}
              </CardDescription>
            </div>
            {!!refresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refresh();
                  setLocalIsRefreshing(true);
                  setTimeout(() => {
                    setLocalIsRefreshing(false);
                  }, 500);
                }}
                disabled={isRefreshing || localIsRefreshing}
                className="shrink-0 h-8 w-8 p-0 sm:h-9 sm:w-9"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    isRefreshing || localIsRefreshing ? "animate-spin" : ""
                  }`}
                />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={hasHeader ? "px-3 sm:px-6 pb-3 sm:pb-6" : "p-3 sm:p-6"}>
        {children}
      </CardContent>
    </Card>
  );
};
