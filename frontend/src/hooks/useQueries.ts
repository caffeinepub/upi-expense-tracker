import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Transaction, UserProfile, MonthlySummary } from '../backend';

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function useGetTransactions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTransactions();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTransaction(transaction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthlySummary'] });
    },
  });
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export function useGetMonthlyExpenseSummary(year: number, month: number) {
  const { actor, isFetching: actorFetching } = useActor();

  // Create a timestamp for the first day of the given month (in nanoseconds for IC)
  const timestamp = BigInt(new Date(year, month, 1).getTime()) * BigInt(1_000_000);

  return useQuery<MonthlySummary[]>({
    queryKey: ['monthlySummary', year, month],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMonthlyExpenseSummary(timestamp);
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Delete All Data ──────────────────────────────────────────────────────────

export function useDeleteAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteAllData();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
