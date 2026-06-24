/** Module keys must match Sidebar `key` and UserManagement permission `id`. */
export const NAV_PERMISSION_KEYS = [
  'dashboard',
  'sales',
  'customers',
  'employees',
  'inventory',
  'orders',
  'quotations',
  'purchases',
  'suppliers',
  'expenses',
  'roznamcha',
  'rent',
  'printingPress',
  'reports',
  'bank',
  'recordLookup',
  'settings',
  'users',
];

const PATH_RULES = [
  ['/users', 'users'],
  ['/settings', 'settings'],
  ['/records/search', 'recordLookup'],
  ['/reports', 'reports'],
  ['/bank', 'bank'],
  ['/printing', 'printingPress'],
  ['/rent', 'rent'],
  ['/roznamcha', 'roznamcha'],
  ['/expenses', 'expenses'],
  ['/suppliers', 'suppliers'],
  ['/purchases', 'purchases'],
  ['/quotations', 'quotations'],
  ['/orders', 'orders'],
  ['/inventory', 'inventory'],
  ['/employees', 'employees'],
  ['/customers', 'customers'],
  ['/sales', 'sales'],
  ['/dashboard', 'dashboard'],
];

export function canAccessModule(user, moduleKey) {
  if (!user) return false;
  if (user.role === 'admin' || user.is_superuser) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(moduleKey);
}

export function getModuleForPath(pathname) {
  const path = pathname || '';
  for (const [prefix, moduleKey] of PATH_RULES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return moduleKey;
    }
  }
  return null;
}

export function canAccessPath(user, pathname) {
  const moduleKey = getModuleForPath(pathname);
  if (!moduleKey) return true;
  return canAccessModule(user, moduleKey);
}

export function getDefaultAllowedPath(user) {
  if (canAccessModule(user, 'dashboard')) return '/dashboard';
  const first = NAV_PERMISSION_KEYS.find((key) => canAccessModule(user, key));
  if (!first) return '/login';
  const rule = PATH_RULES.find(([, key]) => key === first);
  return rule ? rule[0] : '/dashboard';
}
