import { BarChart2, Clock, FileCode, Send } from 'lucide-react';
import React from 'react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Different response types
export interface MempoolStats {
  tx_type_counts: any;
  tx_simple_fee_averages: any;
  tx_ages: any;
  tx_byte_sizes: any;
}

const StatCard = ({ title, icon: Icon, children }: any) => (
  <Card className="w-full">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Icon className="size-4 text-blue-500" />
        </div>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const FeeStats = ({ data }: any) => (
  <div className="space-y-2">
    {Object.entries(data).map(([type, stats]: any) => {
      if (!stats.p50) return null;
      return (
        <div key={type} className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{type.replace(/_/g, ' ')}</span>
          <span className="font-mono">
            {Math.round(stats.p50).toLocaleString()} µSTX
          </span>
        </div>
      );
    })}
  </div>
);

const TypeStats = ({ data }: any) => (
  <div className="space-y-2">
    {Object.entries(data).map(([type, count]: any) => {
      if (count === 0) return null;
      return (
        <div key={type} className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{type.replace(/_/g, ' ')}</span>
          <span className="font-mono">{count.toLocaleString()}</span>
        </div>
      );
    })}
  </div>
);

const AgeStats = ({ data }: any) => (
  <div className="space-y-2">
    {Object.entries(data).map(([type, stats]: any) => {
      if (!stats.p50) return null;
      return (
        <div key={type} className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{type.replace(/_/g, ' ')}</span>
          <span className="font-mono">
            {Math.round(stats.p50).toLocaleString()}s
          </span>
        </div>
      );
    })}
  </div>
);

const SizeStats = ({ data }: any) => (
  <div className="space-y-2">
    {Object.entries(data).map(([type, stats]: any) => {
      if (!stats.p50) return null;
      return (
        <div key={type} className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{type.replace(/_/g, ' ')}</span>
          <span className="font-mono">
            {Math.round(stats.p50).toLocaleString()} bytes
          </span>
        </div>
      );
    })}
  </div>
);

const MempoolStatsView = ({ stats }: { stats: MempoolStats }) => {
  const totalTx: any = Object.values(stats.tx_type_counts).reduce(
    (a, b) => Number(a) + Number(b),
    0
  );

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">
        {totalTx.toLocaleString()} transactions in mempool
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Transaction Types" icon={Send}>
          <TypeStats data={stats.tx_type_counts} />
        </StatCard>

        <StatCard title="Median Fees" icon={BarChart2}>
          <FeeStats data={stats.tx_simple_fee_averages} />
        </StatCard>

        <StatCard title="Median Age" icon={Clock}>
          <AgeStats data={stats.tx_ages} />
        </StatCard>

        <StatCard title="Median Size" icon={FileCode}>
          <SizeStats data={stats.tx_byte_sizes} />
        </StatCard>
      </div>
    </div>
  );
};

export default MempoolStatsView;
