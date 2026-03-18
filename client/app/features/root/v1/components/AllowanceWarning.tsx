import { ContractButton } from "./ContractButton";

export const AllowanceWarning: React.FC<{
  isVisible: boolean;
  requestUnlimitedAllowance: () => void;
  isPending: boolean;
}> = ({ isVisible, requestUnlimitedAllowance, isPending }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-accent border border-border rounded-lg p-4 text-foreground text-sm">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 mr-3 shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.798c.75 1.334-.213 3.003-1.742 3.003H4.483c-1.53 0-2.493-1.67-1.743-3.003l5.517-9.798zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-.993.883L9 6v4a1 1 0 001.993.117L11 10V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="mb-2">
            Your current allowance is insufficient for this deposit. You will
            need to approve a higher allowance before depositing.
          </p>
          <ContractButton
            onClick={requestUnlimitedAllowance}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            {isPending ? "Approving..." : "Set unlimited allowance"}
          </ContractButton>
        </div>
      </div>
    </div>
  );
};
