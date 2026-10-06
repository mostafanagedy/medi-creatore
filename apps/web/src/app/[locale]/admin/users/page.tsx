'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Users, Search, Download, Plus, MoreHorizontal, 
  ShieldAlert, Coins, Ban, Activity, ChevronLeft, ChevronRight,
  Filter, ArrowUpDown, ArrowUp, ArrowDown, Loader2, X, CheckCircle2, Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

// Mock data (fallback if API fails)
const mockUsers = Array.from({ length: 45 }).map((_, i) => ({
  id: `USR-${1000 + i}`,
  name: i % 3 === 0 ? 'Mohamed Ahmed' : i % 3 === 1 ? 'Sarah Connor' : 'Ahmed Youssef',
  email: `user${i}@example.com`,
  role: i === 0 || i === 5 ? 'ADMIN' : 'USER',
  credits: i % 4 === 0 ? 0 : 1500 + i * 100,
  joinedDate: new Date(Date.now() - i * 86400000 * 3).toISOString().split('T')[0],
  status: i % 7 === 0 ? 'SUSPENDED' : 'ACTIVE',
}));

export default function AdminUsersPage() {
  const t = useTranslations('AdminUsers');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: usersData = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiClient.get('/users');
      // The API returns { id, name, email, role, createdAt, isSuspended, creditWallet: { balance } }
      // We map it to match our component's expected structure
      return response.data.map((u: any) => ({
        id: u.id,
        name: u.name || 'Unknown',
        email: u.email,
        role: u.role,
        credits: u.creditWallet?.balance || 0,
        joinedDate: new Date(u.createdAt).toISOString().split('T')[0],
        status: u.isSuspended ? 'SUSPENDED' : 'ACTIVE',
      }));
    }
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string, suspend: boolean }) => {
      await apiClient.patch(`/users/${userId}/suspend`, { suspend });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(
        variables.suspend 
          ? (isRtl ? 'تم حظر المستخدم بنجاح' : 'User suspended successfully')
          : (isRtl ? 'تم إلغاء حظر المستخدم بنجاح' : 'User activated successfully')
      );
    },
    onError: (error: any) => {
      toast.error(
        isRtl ? 'حدث خطأ أثناء تنفيذ العملية' : 'An error occurred while processing your request'
      );
    }
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      await apiClient.patch(`/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isRtl ? 'تم تغيير الصلاحية بنجاح' : 'Role updated successfully');
    },
    onError: () => {
      toast.error(isRtl ? 'حدث خطأ أثناء تنفيذ العملية' : 'An error occurred');
    }
  });

  const manageCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string, amount: number }) => {
      await apiClient.post(`/users/${userId}/credits`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isRtl ? 'تم تعديل الرصيد بنجاح' : 'Credits updated successfully');
      setModalState({ type: null });
      setCreditsInput('');
    },
    onError: () => {
      toast.error(isRtl ? 'حدث خطأ أثناء تنفيذ العملية' : 'An error occurred');
    }
  });

  // Use real data if available, otherwise mock data for preview
  const usersList = usersData.length > 0 ? usersData : mockUsers;

  // New states for selection, sorting, and loading
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof mockUsers[0], direction: 'asc' | 'desc' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [modalState, setModalState] = useState<{ type: 'ADD' | 'CREDITS' | 'DELETE' | null, userId?: string | null }>({ type: null });
  const [creditsInput, setCreditsInput] = useState('');

  // 🔒 BACKEND SECURITY NOTE: 
  // In a real application, ensure that the API routes for changing roles, suspending users, 
  // adding credits, and deleting users all verify that the requesting user has 'SUPER_ADMIN' role.
  // Front-end hiding is not enough to secure these critical actions.

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Credits', 'Status', 'Joined Date'];
    const csvContent = [
      headers.join(','),
      ...paginatedUsers.map(u => `"${u.id}","${u.name}","${u.email}","${u.role}","${u.credits}","${u.status}","${u.joinedDate}"`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'users_export.csv';
    link.click();
  };

  // Handlers wrapped in transition
  const handleSearchChange = (val: string) => {
    setSearch(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleRoleChange = (val: string) => {
    setRoleFilter(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    startTransition(() => {
      setCurrentPage(1);
    });
  };

  const handleSort = (key: keyof typeof mockUsers[0]) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter logic
  let processedUsers = [...usersList].filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                          user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    let matchesStatus = true;
    if (statusFilter === 'NO_CREDITS') matchesStatus = user.credits === 0;
    else if (statusFilter !== 'ALL') matchesStatus = user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort logic
  if (sortConfig) {
    processedUsers.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  const totalPages = Math.ceil(processedUsers.length / itemsPerPage);
  const paginatedUsers = processedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(paginatedUsers.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(u => u !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  // Stats
  const totalUsersCount = usersList.length;
  const activeUsersCount = usersList.filter(u => u.status === 'ACTIVE').length;
  const suspendedUsersCount = usersList.filter(u => u.status === 'SUSPENDED').length;

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 inline-block mx-1" /> : <ArrowDown className="w-3 h-3 inline-block mx-1" />;
    }
    return <ArrowUpDown className="w-3 h-3 inline-block mx-1 text-muted-foreground/50" />;
  };

  return (
    <div className={`space-y-6 ${isRtl ? 'font-arabic' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 h-9 border-white/10" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            {isRtl ? 'تصدير CSV' : 'Export CSV'}
          </Button>
          <Button className="gap-2 h-9 bg-brand-gradient text-white border-0 hover:opacity-90" onClick={() => setModalState({ type: 'ADD' })}>
            <Plus className="w-4 h-4" />
            {isRtl ? 'إضافة مستخدم' : 'Add User'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white/5 border-white/10 shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('totalUsers')}</p>
            <p className="text-2xl font-bold">{totalUsersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10 shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('activeUsers')}</p>
            <p className="text-2xl font-bold text-emerald-400">{activeUsersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10 shadow-none flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('suspendedUsers')}</p>
            <p className="text-2xl font-bold text-red-400">{suspendedUsersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <Ban className="w-5 h-5 text-red-400" />
          </div>
        </Card>
      </div>

      <Card className="glass-card border-white/5 shadow-none overflow-hidden relative">
        {/* Loading Overlay */}
        {isPending && (
          <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-primary bg-background/80 px-4 py-2 rounded-full shadow-lg border border-primary/20">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">{t('loading')}</span>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        {/* Filters and Search or Bulk Actions */}
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 h-auto md:h-[68px]">
          {selectedUsers.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-md shrink-0">
                  {selectedUsers.length} {isRtl ? 'مستخدمين محددين' : 'users selected'}
                </span>
                <Button variant="outline" size="sm" className="h-8 gap-2 bg-black/20" onClick={() => setModalState({ type: 'CREDITS' })}>
                  <Coins className="w-3.5 h-3.5" />
                  {isRtl ? 'إضافة رصيد للمحددين' : 'Add credits'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20 bg-black/20"
                  disabled={toggleSuspendMutation.isPending}
                  onClick={() => {
                    Promise.all(selectedUsers.map(userId => 
                      toggleSuspendMutation.mutateAsync({ userId, suspend: true })
                    )).then(() => setSelectedUsers([]));
                  }}
                >
                  <Ban className="w-3.5 h-3.5" />
                  {isRtl ? 'حظر المحددين' : 'Suspend selected'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/20 border-red-500/30 bg-black/20" onClick={() => setModalState({ type: 'DELETE' })}>
                  <Trash2 className="w-3.5 h-3.5" />
                  {isRtl ? 'حذف المحددين' : 'Delete selected'}
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])} className="text-muted-foreground hover:text-foreground shrink-0">
                {isRtl ? 'إلغاء التحديد' : 'Clear selection'}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className={`w-full h-9 bg-black/20 border border-white/10 rounded-md text-sm focus:outline-none focus:border-primary/50 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                  />
                </div>
              </div>

              <div className="flex w-full md:w-auto items-center gap-2">
                <div className="flex items-center gap-2 text-sm bg-black/20 border border-white/10 rounded-md px-2 h-9">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    className="bg-transparent border-none outline-none text-sm text-foreground [&>option]:bg-zinc-900"
                    value={roleFilter}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <option value="ALL">{t('filterRole')}: {t('filterAll')}</option>
                    <option value="ADMIN">{t('filterAdmin')}</option>
                    <option value="USER">{t('filterUser')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-sm bg-black/20 border border-white/10 rounded-md px-2 h-9">
                  <select 
                    className="bg-transparent border-none outline-none text-sm text-foreground [&>option]:bg-zinc-900"
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="ALL">{t('filterStatus')}: {t('filterAll')}</option>
                    <option value="ACTIVE">{t('filterActive')}</option>
                    <option value="SUSPENDED">{t('filterSuspended')}</option>
                    <option value="NO_CREDITS">{t('filterNoCredits')}</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-white/20 bg-black/20 text-primary cursor-pointer w-4 h-4 align-middle"
                    checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th 
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort('name')}
                >
                  {t('name')} / {t('email')}
                  <SortIcon columnKey="name" />
                </th>
                <th 
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort('role')}
                >
                  {t('role')}
                  <SortIcon columnKey="role" />
                </th>
                <th 
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort('credits')}
                >
                  {t('credits')}
                  <SortIcon columnKey="credits" />
                </th>
                <th 
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort('joinedDate')}
                >
                  {t('joinedDate')}
                  <SortIcon columnKey="joinedDate" />
                </th>
                <th 
                  className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => handleSort('status')}
                >
                  {t('status')}
                  <SortIcon columnKey="status" />
                </th>
                <th className="px-4 py-3 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    {isRtl ? 'جاري تحميل البيانات...' : 'Loading data...'}
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-white/20 bg-black/20 text-primary cursor-pointer w-4 h-4 align-middle"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${
                        user.role === 'SUPER_ADMIN'
                          ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                          : user.role === 'ADMIN' 
                            ? 'border-primary/50 text-primary bg-primary/10' 
                            : 'border-white/10'
                      }`}>
                        {user.role === 'SUPER_ADMIN' ? (isRtl ? 'سوبر أدمن' : 'Super Admin') : user.role === 'ADMIN' ? t('filterAdmin') : t('filterUser')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-xs ${user.credits === 0 ? 'text-red-400 font-bold' : ''}`}>
                        {user.credits.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {user.joinedDate}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] ${user.status === 'ACTIVE' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                        {user.status === 'ACTIVE' ? t('filterActive') : t('filterSuspended')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isRtl ? 'start' : 'end'} className="w-56 border-white/10 bg-black/90 backdrop-blur-xl">
                            {user.role !== 'SUPER_ADMIN' && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'SUPER_ADMIN' })}>
                                <ShieldAlert className="w-4 h-4 text-purple-400" />
                                {isRtl ? 'ترقية إلى سوبر أدمن' : 'Make Super Admin'}
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'ADMIN' && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'ADMIN' })}>
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                {isRtl ? 'تعيين كأدمن' : 'Make Admin'}
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'USER' && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => changeRoleMutation.mutate({ userId: user.id, role: 'USER' })}>
                                <Users className="w-4 h-4 text-muted-foreground" />
                                {isRtl ? 'تعيين كمستخدم' : 'Make User'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setModalState({ type: 'CREDITS', userId: user.id })}>
                              <Coins className="w-4 h-4 text-muted-foreground" />
                              {isRtl ? 'تعديل الرصيد' : 'Manage Credits'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {user.status === 'ACTIVE' ? (
                              <DropdownMenuItem 
                                className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                onClick={() => toggleSuspendMutation.mutate({ userId: user.id, suspend: true })}
                              >
                                <Ban className="w-4 h-4" />
                                {isRtl ? 'حظر المستخدم' : 'Suspend User'}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="gap-2 text-emerald-400 focus:text-emerald-400 focus:bg-emerald-500/10 cursor-pointer"
                                onClick={() => toggleSuspendMutation.mutate({ userId: user.id, suspend: false })}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                {isRtl ? 'إلغاء الحظر' : 'Activate User'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer" onClick={() => setModalState({ type: 'DELETE', userId: user.id })}>
                              <Trash2 className="w-4 h-4" />
                              {isRtl ? 'حذف المستخدم' : 'Delete User'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-sm gap-4">
            <div className="text-muted-foreground">
              {t('showingPagination', { 
                start: (currentPage - 1) * itemsPerPage + 1, 
                end: Math.min(currentPage * itemsPerPage, processedUsers.length),
                total: processedUsers.length
              })}
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-white/10"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
              <div className="px-2 text-muted-foreground text-xs">
                {t('page', { current: currentPage, total: totalPages })}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 border-white/10"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      {modalState.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-md overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="font-semibold">
                {modalState.type === 'ADD' && (isRtl ? 'إضافة مستخدم جديد' : 'Add New User')}
                {modalState.type === 'CREDITS' && (isRtl ? 'تعديل الرصيد' : 'Manage Credits')}
                {modalState.type === 'DELETE' && (isRtl ? 'تأكيد الحذف' : 'Confirm Deletion')}
              </h3>
              <button onClick={() => setModalState({ type: null })} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              {modalState.type === 'ADD' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">{isRtl ? 'الاسم' : 'Name'}</label>
                    <input type="text" className="w-full h-9 bg-black/20 border border-white/10 rounded-md text-sm px-3 focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">{isRtl ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input type="email" className="w-full h-9 bg-black/20 border border-white/10 rounded-md text-sm px-3 focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                    <input type="password" className="w-full h-9 bg-black/20 border border-white/10 rounded-md text-sm px-3 focus:outline-none focus:border-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">{isRtl ? 'الصلاحية' : 'Role'}</label>
                    <select className="w-full h-9 bg-black/20 border border-white/10 rounded-md text-sm px-3 focus:outline-none focus:border-primary/50 [&>option]:bg-zinc-900">
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <Button className="w-full mt-2 bg-brand-gradient text-white border-0" onClick={() => setModalState({ type: null })}>
                    {isRtl ? 'إنشاء المستخدم' : 'Create User'}
                  </Button>
                </div>
              )}

              {modalState.type === 'CREDITS' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isRtl ? 'اكتب الرقم لإضافته (مثلاً 500) أو خصمه (مثلاً -200):' : 'Enter amount to add (e.g. 500) or deduct (e.g. -200):'}
                  </p>
                  <input 
                    type="number" 
                    value={creditsInput}
                    onChange={(e) => setCreditsInput(e.target.value)}
                    placeholder="+500"
                    className={`w-full h-10 bg-black/20 border border-white/10 rounded-md font-mono text-center text-lg focus:outline-none focus:border-primary/50 ${isRtl ? 'text-right' : 'text-left'}`} 
                    dir="ltr"
                  />
                  <Button 
                    className="w-full mt-2 bg-primary text-white" 
                    disabled={manageCreditsMutation.isPending || !creditsInput}
                    onClick={() => {
                      if (modalState.userId && creditsInput) {
                        manageCreditsMutation.mutate({ userId: modalState.userId, amount: parseInt(creditsInput) });
                      }
                    }}
                  >
                    {manageCreditsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isRtl ? 'حفظ الرصيد' : 'Save Credits')}
                  </Button>
                </div>
              )}

              {modalState.type === 'DELETE' && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 mx-auto flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-foreground">{isRtl ? 'هل أنت متأكد؟' : 'Are you sure?'}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isRtl 
                        ? 'سيتم حذف كل بيانات ومحتوى هذا المستخدم نهائياً. هذا الإجراء لا يمكن التراجع عنه.'
                        : 'This user and all associated data will be permanently deleted. This action cannot be undone.'}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 border-white/10" onClick={() => setModalState({ type: null })}>
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => setModalState({ type: null })}>
                      {isRtl ? 'نعم، احذف' : 'Yes, Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
