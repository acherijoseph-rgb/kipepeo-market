import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
} from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  formatKES,
  type Product,
  type ProductCategory,
} from '../types';
import { ProductImage } from './ProductImage';

interface StorefrontViewProps {
  products: Product[];
  loading: boolean;
  focusCategories?: boolean;
  onAddToCart: (product: Product, variant: string, quantity: number) => void;
  onGoToTrack: () => void;
}

export function StorefrontView({
  products,
  loading,
  focusCategories = false,
  onAddToCart,
  onGoToTrack,
}: StorefrontViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [sortOrder, setSortOrder] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>(
    'featured'
  );
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [modalVariant, setModalVariant] = useState<string>('');
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });

    if (sortOrder === 'price-asc') {
      list = [...list].sort((a, b) => a.priceKes - b.priceKes);
    } else if (sortOrder === 'price-desc') {
      list = [...list].sort((a, b) => b.priceKes - a.priceKes);
    } else if (sortOrder === 'newest') {
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [products, searchQuery, selectedCategory, sortOrder]);

  const openProductDetail = (product: Product) => {
    setActiveProduct(product);
    setModalVariant(product.variants[0] || 'Standard');
    setModalQuantity(1);
  };

  const handleQuickAdd = (product: Product) => {
    if (product.stock < 1) return;
    onAddToCart(product, product.variants[0] || 'Standard', 1);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Section 1: Storefront Hero */}
      {!focusCategories && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden">
            <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider uppercase text-[#065F46] mb-4">
                  Nairobi Curated General Store
                </p>
                <h1
                  className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#18181B] leading-[1.1] tracking-tight mb-5"
                  style={{ textWrap: 'balance' }}
                >
                  Everything you need, all in one place.
                </h1>
                <p className="text-base text-[#52525B] leading-relaxed max-w-md mb-8">
                  Thoughtfully sourced electronics, kitchenware, apparel, and botanical care—delivered across Kenya with instant M-Pesa STK Push and card checkout.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#catalogue"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Shop Catalogue</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={onGoToTrack}
                  className="inline-flex items-center px-5 py-3 rounded-lg border border-[#E4E4E7] bg-white text-sm font-medium text-[#18181B] hover:bg-[#F4F4F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Track an Order
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 min-h-[280px] lg:min-h-[440px] bg-[#F4F4F5]">
              <ProductImage
                src="/src/assets/images/hero_kipepeo_lifestyle_1795603349319.jpg"
                alt="Curated collection of Kipepeo Market headphones, ceramic pour-over kettle, botanical skincare, and organic linen throw"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Section 2: Catalogue & Search Workspace */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
              {selectedCategory === 'All' ? 'Shop All Products' : selectedCategory}
            </h2>
            <p className="text-sm text-[#52525B] mt-1 tabular-nums">
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} available
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search
                className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, or SKU..."
                aria-label="Search products"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#065F46]"
              />
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              aria-label="Sort products"
              className="px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm text-[#18181B] focus:outline-none focus:border-[#065F46] cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="flex items-center gap-2 overflow-x-auto py-4"
          role="tablist"
          aria-label="Product categories"
        >
          {(['All', ...PRODUCT_CATEGORIES] as const).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#18181B] text-white'
                    : 'bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#18181B] hover:border-[#D4D4D8]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#F4F4F5]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-28 bg-[#F4F4F5] rounded" />
                  <div className="h-5 w-48 bg-[#F4F4F5] rounded" />
                  <div className="h-4 w-24 bg-[#F4F4F5] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-12 text-center mt-2">
            <p className="font-display text-lg font-semibold text-[#18181B]">
              No matching products found
            </p>
            <p className="text-sm text-[#71717A] mt-1 mb-5">
              Try clearing your search filter or switching to another category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-lg bg-[#18181B] text-white text-sm font-medium hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredProducts.map((product) => {
              const outOfStock = product.stock <= 0;
              const lowStock = product.stock > 0 && product.stock <= 5;
              const wasJustAdded = justAddedId === product.id;

              return (
                <article
                  key={product.id}
                  className="group bg-white border border-[#E4E4E7] rounded-xl overflow-hidden flex flex-col transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => openProductDetail(product)}
                    className="aspect-[4/3] w-full bg-[#F4F4F5] overflow-hidden block text-left cursor-pointer"
                  >
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#71717A]">
                        <span className="uppercase tracking-wider truncate">
                          {product.brand} · {product.category}
                        </span>
                        <span
                          className={`shrink-0 font-medium ${
                            outOfStock
                              ? 'text-[#B91C1C]'
                              : lowStock
                              ? 'text-[#B45309]'
                              : 'text-[#065F46]'
                          }`}
                        >
                          {outOfStock
                            ? 'Out of Stock'
                            : lowStock
                            ? `${product.stock} left`
                            : 'In Stock'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => openProductDetail(product)}
                        className="mt-1.5 text-left block w-full cursor-pointer"
                      >
                        <h3 className="text-base font-semibold text-[#18181B] group-hover:text-[#065F46] transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                      </button>
                    </div>

                    <div className="pt-3 border-t border-[#F4F4F5] flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-bold text-[#18181B] tabular-nums">
                          {formatKES(product.priceKes)}
                        </span>
                        {product.compareAtKes && product.compareAtKes > product.priceKes && (
                          <span className="text-xs text-[#71717A] line-through tabular-nums">
                            {formatKES(product.compareAtKes)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={() => handleQuickAdd(product)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          wasJustAdded
                            ? 'bg-[#15803D] text-white'
                            : 'bg-[#18181B] text-white hover:bg-[#065F46]'
                        }`}
                      >
                        {outOfStock ? 'Unavailable' : wasJustAdded ? 'Added to Bag' : 'Add to Bag'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Store Assurance Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-[#E4E4E7] rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#065F46] shrink-0">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#18181B]">M-Pesa STK Push & Card</h3>
              <p className="text-sm text-[#52525B] mt-1 leading-relaxed">
                Pay directly from your Safaricom phone prompt or Visa and Mastercard with instant confirmation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#065F46] shrink-0">
              <Truck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#18181B]">
                Same-Day Nairobi Dispatch
              </h3>
              <p className="text-sm text-[#52525B] mt-1 leading-relaxed">
                Complimentary delivery on orders over KES 5,000, with next-day courier nationwide.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#065F46] shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#18181B]">14-Day Return Assurance</h3>
              <p className="text-sm text-[#52525B] mt-1 leading-relaxed">
                Every item is inspected at our Nairobi hub before dispatch and backed by warranty support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Detail Modal (PDP Contiguous Purchase Module) */}
      {activeProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={activeProduct.name}
        >
          <div className="bg-white border border-[#E4E4E7] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 shadow-2xl">
            <div className="bg-[#F4F4F5] aspect-[4/3] md:aspect-auto md:min-h-[420px]">
              <ProductImage src={activeProduct.imageUrl} alt={activeProduct.name} />
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs uppercase tracking-wider text-[#71717A]">
                    {activeProduct.brand} · {activeProduct.category} ·{' '}
                    <span className="font-mono">{activeProduct.sku}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveProduct(null)}
                    className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#18181B] cursor-pointer"
                    aria-label="Close product details"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="font-display text-2xl font-bold text-[#18181B] mt-2">
                  {activeProduct.name}
                </h2>

                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-[#18181B] tabular-nums">
                    {formatKES(activeProduct.priceKes)}
                  </span>
                  {activeProduct.compareAtKes &&
                    activeProduct.compareAtKes > activeProduct.priceKes && (
                      <span className="text-sm text-[#71717A] line-through tabular-nums">
                        {formatKES(activeProduct.compareAtKes)}
                      </span>
                    )}
                </div>

                <p className="mt-4 text-sm text-[#52525B] leading-relaxed">
                  {activeProduct.description}
                </p>

                {activeProduct.variants.length > 0 && (
                  <div className="mt-6">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#52525B] mb-2">
                      Option
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeProduct.variants.map((variant) => {
                        const selected = modalVariant === variant;
                        return (
                          <button
                            key={variant}
                            type="button"
                            onClick={() => setModalVariant(variant)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              selected
                                ? 'border-[#065F46] bg-[#065F46]/10 text-[#065F46]'
                                : 'border-[#E4E4E7] bg-white text-[#3F3F46] hover:border-[#A1A1AA]'
                            }`}
                          >
                            {variant}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-5 border-t border-[#E4E4E7] space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#52525B]">Availability</span>
                  <span
                    className={`font-medium tabular-nums ${
                      activeProduct.stock > 0 ? 'text-[#065F46]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {activeProduct.stock > 0
                      ? `${activeProduct.stock} units ready to ship`
                      : 'Currently out of stock'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-[#E4E4E7] rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-11 inline-flex items-center justify-center text-[#52525B] hover:text-[#18181B] cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold tabular-nums">
                      {modalQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModalQuantity((q) => Math.min(Math.max(1, activeProduct.stock), q + 1))
                      }
                      className="w-10 h-11 inline-flex items-center justify-center text-[#52525B] hover:text-[#18181B] cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={activeProduct.stock <= 0}
                    onClick={() => {
                      onAddToCart(activeProduct, modalVariant, modalQuantity);
                      setActiveProduct(null);
                    }}
                    className="flex-1 py-3 px-5 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>
                      Add to Bag · {formatKES(activeProduct.priceKes * modalQuantity)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
