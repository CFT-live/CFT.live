import {
  useQuery as realUseQuery,
  type UseQueryOptions as RealUseQueryOptions,
  type UseQueryResult,
  type QueryKey,
  type DefaultError,
} from "@tanstack/react-query";
import { MOCK_DATA } from "../test/mocks";

type UseQueryOptions<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> = RealUseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  // Type never is intentional to avoid this value to be passed by mistake in production
  mock?: never;
};

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TQueryFnData, TError> {
  const { mock, ...queryOptions } = options;

  // If mock is true, return mock data instead of real query
  if (mock === true && process.env.NEXT_ENVIRONMENT !== "prod") {
    const queryKey = Array.isArray(queryOptions.queryKey)
      ? queryOptions.queryKey[0]
      : queryOptions.queryKey;

    const mockData = MOCK_DATA[
      queryKey as keyof typeof MOCK_DATA
    ] as TQueryFnData;

    return {
      data: mockData,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: true,
      status: "success" as const,
      refetch: async () =>
        ({
          data: mockData,
          isSuccess: true,
          isError: false,
          error: null,
          status: "success" as const,
        }),
      fetchStatus: "idle" as const,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isLoadingError: false,
      isRefetchError: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      errorUpdateCount: 0,
      isFetched: true,
      isFetchedAfterMount: true,
      isPlaceholderData: false,
      isStale: false,
    } as UseQueryResult<TQueryFnData, TError>;
  }

  return realUseQuery<TQueryFnData, TError, TData, TQueryKey>(
    queryOptions
  ) as UseQueryResult<TQueryFnData, TError>;
}
