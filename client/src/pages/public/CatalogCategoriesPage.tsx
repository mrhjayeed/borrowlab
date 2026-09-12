import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ComponentCategory, ComponentCatalog } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Compass,
  Cpu,
  Layers,
  ArrowRight,
  Search,
} from 'lucide-react';

export const CatalogCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [components, setComponents] = useState<ComponentCatalog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.getCategories(), api.getComponents()])
      .then(([catRes, compRes]) => {
        setCategories(catRes.categories);
        setComponents(compRes.components);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filteredComponents = components.filter((c) => {
    const matchesCategory = selectedCategory ? c.category_id === selectedCategory : true;
    const matchesSearch = search
      ? c.component_name.toLowerCase().includes(search.toLowerCase()) ||
        c.model.toLowerCase().includes(search.toLowerCase()) ||
        (c.manufacturer || '').toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Hardware Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Standardized categories, canonical component specifications, and physical fleet numbers
          </p>
        </div>

        <Link to="/browse">
          <Button variant="primary" size="sm" className="gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Marketplace Browse
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Categories Tree */}
        <div className="space-y-2">
          <div className="label-caps px-2 text-slate-400">Categories</div>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded text-xs font-semibold transition-colors flex items-center justify-between ${
              selectedCategory === null ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'hover:bg-slate-100 text-slate-700'
            }`}
          >
            <span>All Categories</span>
            <span className="font-mono text-[10px] text-slate-400">{components.length}</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => setSelectedCategory(cat.category_id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                selectedCategory === cat.category_id
                  ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="truncate">{cat.name}</span>
              <span className="font-mono text-[10px] text-slate-400">{cat.component_count || 0}</span>
            </button>
          ))}
        </div>

        {/* Right Component Specifications Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-caps text-slate-400">
              Hardware Components ({filteredComponents.length})
            </span>
            <input
              type="text"
              placeholder="Search component catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-[32px] px-3 text-xs bg-white border border-slate-300 rounded-[6px] w-64 focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredComponents.map((c) => (
              <Card key={c.component_id} className="p-4 space-y-3 hover:border-slate-300 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="label-caps text-[#4F46E5]">{c.category_name}</span>
                    <Badge variant={c.available_units && c.available_units > 0 ? 'available' : 'neutral'} size="sm">
                      {c.available_units || 0} Available
                    </Badge>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 mt-1">{c.component_name}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {c.manufacturer} • Model: {c.model}
                  </div>

                  {c.specifications && (
                    <p className="text-[11px] text-slate-600 font-mono mt-2 p-2 bg-slate-50 rounded border border-slate-100 line-clamp-2">
                      {c.specifications}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="font-mono text-[11px] text-slate-500">
                    Fleet: <strong className="text-slate-800">{c.total_units || 0}</strong> physical units
                  </div>

                  <Link to={`/browse?search=${encodeURIComponent(c.model)}`}>
                    <Button variant="secondary" size="sm" className="gap-1 text-xs">
                      View Listings <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
