"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import * as React from "react";

type ContractButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

export const ContractButton = ({
  onClick,
  children,
  ...props
}: ContractButtonProps) => {
  const { isConnected } = useAppKitAccount();
  const { open } = useAppKit();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isConnected) {
      onClick?.(e);
    } else {
      open();
    }
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
};
