import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsPage } from '../src/pages/ProductsPage';
import i18n from '../src/i18n';
import { adminApi } from '../src/api/adminApi';

vi.mock('../src/api/adminApi', () => ({
  adminApi: {
    categories: { list: vi.fn() },
    products: {
      adminList: vi.fn(),
      exportExcel: vi.fn(),
      createOrUpdateMultipart: vi.fn(),
      setStatus: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
    },
  },
}));

const pageResponse = {
  content: [
    {
      id: 1,
      productCode: 'P_APPLE',
      name: 'Apple',
      status: 'ACTIVE',
      image: null,
      isFeatured: false,
      category: { id: 10, name: 'Fruit' },
      variants: [
        {
          id: 20,
          sku: 'SKU-APPLE',
          barcode: null,
          variantName: 'Red bag',
          color: 'Red',
          size: '1kg',
          unit: 'bag',
          netPrice: 45000,
          stock: 12,
          status: 'ACTIVE',
        },
      ],
    },
  ],
  number: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductsPage />
    </QueryClientProvider>
  );
};

describe('ProductsPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
    vi.mocked(adminApi.categories.list).mockResolvedValue([
      { id: 10, categoryCode: 'FRUIT', name: 'Fruit', description: null, sortOrder: 1, isActive: true },
    ]);
    vi.mocked(adminApi.products.adminList).mockResolvedValue(pageResponse);
    vi.mocked(adminApi.products.exportExcel).mockResolvedValue(new Blob(['xlsx']));
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders products and sends debounced search params', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Apple')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Search name or product code'), 'banana');

    await waitFor(() => {
      expect(adminApi.products.adminList).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'banana' }));
    });
  });

  it('exports Excel with current filters', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Apple');
    await user.click(screen.getAllByRole('button', { name: /Export Excel/i })[0]);

    await waitFor(() => {
      expect(adminApi.products.exportExcel).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }));
    });
  });

  it('keeps submit disabled until required product and variant data are valid', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findAllByText('Apple')).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /Create product/i }));
    expect(screen.getAllByRole('button', { name: /Create product/i }).at(-1)).toBeDisabled();
  });
});
