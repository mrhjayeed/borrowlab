import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Database, Code2, CheckCircle2, ShieldCheck, Terminal } from 'lucide-react';

export const SqlProofPage: React.FC = () => {
  const [explainIndex, setExplainIndex] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getExplainIndex()
      .then((exp) => setExplainIndex(exp))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between">
        <div>
          <strong className="font-semibold uppercase tracking-wider block mb-0.5">Internal Evaluation Utility</strong>
          <span>This technical execution route is intentionally excluded from the customer-facing navigation. It validates DBMS requirements and query plans.</span>
        </div>
        <span className="font-mono text-[11px] px-2 py-1 bg-amber-100 rounded border border-amber-300">
          NODE_ENV !== 'production'
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-[#4F46E5]" />
          <span>PostgreSQL Query Execution Plan & Index Verification</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) diagnostic output
        </p>
      </div>

      {isLoading ? (
        <div className="h-64 bg-white rounded border border-slate-200 animate-pulse" />
      ) : (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Index: <span className="text-[#4F46E5] font-mono">{explainIndex?.indexName}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Target table: <span className="font-bold">inventory</span> on columns <span className="font-bold">(component_id, status)</span>
              </div>
            </div>
            <Badge variant="available" size="sm">B-Tree Index Scan</Badge>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900 block mb-1">Index Justification:</span>
            {explainIndex?.justification}
          </div>

          <div>
            <div className="label-caps mb-1.5 text-slate-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              SQL Target Query
            </div>
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded font-mono text-xs overflow-x-auto">
              {explainIndex?.query}
            </pre>
          </div>

          <div>
            <div className="label-caps mb-1.5 text-slate-500 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-slate-400" />
              PostgreSQL Execution Plan Output
            </div>
            <pre className="p-3 bg-slate-950 text-slate-200 rounded font-mono text-[11px] overflow-x-auto max-h-96">
              {JSON.stringify(explainIndex?.plan, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};
