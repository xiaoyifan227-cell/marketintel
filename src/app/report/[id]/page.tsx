'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReportView from '@/components/ReportView';

export default function ReportPage() {
  const params = useParams();
  const [report, setReport] = useState<unknown>(null);

  useEffect(() => {
    const data = localStorage.getItem(`report_${params.id}`);
    if (data) setReport(JSON.parse(data));
  }, [params.id]);

  if (!report) return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading report…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <ReportView report={report} />
    </div>
  );
}
