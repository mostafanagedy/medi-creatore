'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type OrganizationProfile = {
  creditWallet?: { balance: number };
  memberships?: Array<{
    organization?: {
      id: string;
      isPersonal: boolean;
      plan: string;
    };
  }>;
};

export function useDefaultOrganization() {
  const query = useQuery<OrganizationProfile>({
    queryKey: ['profile'],
    staleTime: 60000,
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response.data?.data;
    },
  });

  const organizations = query.data?.memberships
    ?.map((membership) => membership.organization)
    .filter((organization): organization is NonNullable<typeof organization> => Boolean(organization));
  const organization = organizations?.find((item) => item.isPersonal) ?? organizations?.[0];

  return {
    ...query,
    organizationId: organization?.id,
    plan: organization?.plan,
    credits: query.data?.creditWallet?.balance ?? 0,
  };
}
