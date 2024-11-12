'use client';
import { ShieldCheck, Settings, Database, Link } from 'lucide-react';
import React, { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AlignmentBadge = ({ alignment }: any) => {
  const getAlignmentInfo = (value: any) => {
    const alignments = {
      0: { label: 'Undefined', color: 'bg-gray-500' },
      1: { label: 'Lawful Constructive', color: 'bg-green-500' },
      2: { label: 'Neutral Constructive', color: 'bg-emerald-500' },
      3: { label: 'Chaotic Constructive', color: 'bg-blue-500' },
      4: { label: 'Lawful Neutral', color: 'bg-yellow-500' },
      5: { label: 'True Neutral', color: 'bg-orange-500' },
      6: { label: 'Chaotic Neutral', color: 'bg-purple-500' },
      7: { label: 'Lawful Extractive', color: 'bg-red-700' },
      8: { label: 'Neutral Extractive', color: 'bg-red-500' },
      9: { label: 'Chaotic Extractive', color: 'bg-red-900' },
    };
    return alignments[value as keyof typeof alignments] || alignments[0];
  };

  const info = getAlignmentInfo(alignment);
  return <Badge className={`${info.color} text-white`}>{info.label}</Badge>;
};

const ArcanaInterface = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [owner, setOwner] = useState('');
  const [currentMetrics, setCurrentMetrics] = useState({
    alignment: 0,
    qualityScore: 0,
    circulatingSupply: 0,
    metadataUri: '',
  });

  // New contract metrics for setting
  const [newMetrics, setNewMetrics] = useState({
    alignment: 0,
    qualityScore: 0,
    circulatingSupply: 0,
    metadataUri: '',
  });

  const handleFetchMetrics = () => {
    // Mock fetch - replace with actual contract calls
    setCurrentMetrics({
      alignment: 1,
      qualityScore: 8500,
      circulatingSupply: 1000000,
      metadataUri: 'https://example.com/metadata',
    });
  };

  const handleSetMetrics = () => {
    // Mock set - replace with actual contract calls
    console.log('Setting new metrics:', newMetrics);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ShieldCheck className="size-6" />
            Arcana Contract Interface
          </CardTitle>
          <CardDescription>
            Monitor and manage smart contract intelligence metrics
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contract Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter contract address"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                />
                <Button onClick={handleFetchMetrics}>Fetch Metrics</Button>
              </div>

              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Alignment</TableCell>
                    <TableCell>
                      <AlignmentBadge alignment={currentMetrics.alignment} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Quality Score</TableCell>
                    <TableCell>
                      {(currentMetrics.qualityScore / 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Circulating Supply
                    </TableCell>
                    <TableCell>
                      {currentMetrics.circulatingSupply.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Metadata URI</TableCell>
                    <TableCell className="truncate max-w-xs">
                      <a
                        href={currentMetrics.metadataUri}
                        className="text-blue-500 hover:underline"
                      >
                        {currentMetrics.metadataUri}
                      </a>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Alignment</label>
                <Input
                  type="number"
                  min="0"
                  max="9"
                  value={newMetrics.alignment}
                  onChange={(e) =>
                    setNewMetrics({
                      ...newMetrics,
                      alignment: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quality Score (0-100%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  value={newMetrics.qualityScore}
                  onChange={(e) =>
                    setNewMetrics({
                      ...newMetrics,
                      qualityScore: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Circulating Supply
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newMetrics.circulatingSupply}
                  onChange={(e) =>
                    setNewMetrics({
                      ...newMetrics,
                      circulatingSupply: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Metadata URI</label>
                <Input
                  value={newMetrics.metadataUri}
                  onChange={(e) =>
                    setNewMetrics({
                      ...newMetrics,
                      metadataUri: e.target.value,
                    })
                  }
                />
              </div>

              <Button className="w-full" onClick={handleSetMetrics}>
                Update All Metrics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contract Owner Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="New owner address"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
            <Button onClick={() => console.log('Setting new owner:', owner)}>
              Set New Owner
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArcanaInterface;
