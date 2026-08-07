import { useEffect } from 'react';
import { apiService } from '../services/api';
import { demoStore } from '../services/demoStore';

const isDemoTenant = (tenantCode) => String(tenantCode || '').toUpperCase() === 'DEMO-STORE';

export default function DemoFlowBootstrap() {
  useEffect(() => {
    const original = {
      getProducts: apiService.getProducts,
      getUsers: apiService.getUsers,
      getServices: apiService.getServices,
      getTransactions: apiService.getTransactions,
      addProduct: apiService.addProduct,
      updateProduct: apiService.updateProduct,
      deleteProduct: apiService.deleteProduct,
      get: apiService.get,
      post: apiService.post,
      trackService: apiService.trackService,
    };

    apiService.getProducts = async (tenantCode) => isDemoTenant(tenantCode) ? demoStore.getProducts() : original.getProducts(tenantCode);
    apiService.getUsers = async (tenantCode) => isDemoTenant(tenantCode) ? demoStore.getUsers() : original.getUsers(tenantCode);
    apiService.getServices = async (tenantCode) => isDemoTenant(tenantCode) ? demoStore.getServices() : original.getServices(tenantCode);
    apiService.getTransactions = async (tenantCode) => isDemoTenant(tenantCode) ? demoStore.getTransactions() : original.getTransactions(tenantCode);

    apiService.addProduct = async (productData, userName) => isDemoTenant(productData?.tenant_code)
      ? demoStore.addProduct(productData)
      : original.addProduct(productData, userName);

    apiService.updateProduct = async (id, productData, currentStock, userName, description) => isDemoTenant(productData?.tenant_code) || String(id).startsWith('PROD-')
      ? demoStore.updateProduct(id, productData)
      : original.updateProduct(id, productData, currentStock, userName, description);

    apiService.deleteProduct = async (id) => String(id).startsWith('PROD-')
      ? demoStore.deleteProduct(id)
      : original.deleteProduct(id);

    apiService.get = async (endpoint) => {
      if (endpoint === '/services/DEMO-STORE') return demoStore.getServices();
      if (endpoint === '/transactions/DEMO-STORE') return demoStore.getTransactions();
      if (endpoint === '/products/DEMO-STORE') return demoStore.getProducts();
      if (endpoint === '/users/DEMO-STORE') return demoStore.getUsers();
      return original.get(endpoint);
    };

    apiService.post = async (endpoint, body = {}) => {
      if (isDemoTenant(body.tenant_code)) {
        if (endpoint === '/services') return demoStore.addService(body);
        if (endpoint === '/services/update') {
          const { resi, tenant_code, ...updates } = body;
          return demoStore.updateService(resi, updates);
        }
        if (endpoint === '/services/finish') return demoStore.updateService(body.resi, body);
        if (endpoint === '/transactions') return demoStore.addTransaction(body);
        if (endpoint === '/users') return demoStore.addUser(body);
        if (endpoint === '/products') return demoStore.addProduct(body);
      }
      return original.post(endpoint, body);
    };

    apiService.trackService = async (resi) => {
      const demo = demoStore.findService(resi);
      if (demo) return { ...demo, tenant_name: 'UnitPro Demo Store' };
      return original.trackService(resi);
    };

    window.UnitProDemo = {
      reset: () => demoStore.reset(),
      load: () => ({
        products: demoStore.getProducts(),
        users: demoStore.getUsers(),
        services: demoStore.getServices(),
        transactions: demoStore.getTransactions(),
      }),
    };

    return () => {
      Object.assign(apiService, original);
      delete window.UnitProDemo;
    };
  }, []);

  return null;
}
