import React, { useEffect, useState } from 'react';
import { Award, Download, Calendar, FileText } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import { getFileDownloadUrl } from '../../utils/fileUrl';

export const AttestationReportsPage: React.FC = () => {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/customer/reports/years')
      .then((res) => {
        if (res.data.years?.length > 0) {
          setYears(res.data.years);
          setSelectedYear(res.data.years[0]);
        }
      })
      .catch((err) => toast.error('Failed to load assessment years.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    api
      .get(`/customer/reports?year=${selectedYear}`)
      .then((res) => setReports(res.data.reports))
      .catch((err) => toast.error('Failed to load reports for selected year.'));
  }, [selectedYear]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Compliance Attestations & Reports</h2>
        <p className="text-sm text-slate-500 font-medium">
          Official audit deliverables, AOC (Attestation of Compliance), ROC, AOT, and ROT deliverables.
        </p>
      </div>

      {/* Year Filter Pills */}
      {years.length > 0 && (
        <div className="flex space-x-2 border-b border-slate-200 pb-3">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 ${
                selectedYear === y
                  ? 'bg-sky-50 text-sky-600 font-bold border border-sky-200 shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-medium'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Assessment Year {y}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading audit reports...</div>
        ) : reports.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No formal reports published yet for year {selectedYear}.
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r._id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-400 shadow-2xs transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      r.reportOf === 'AOC'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.reportOf === 'ROC'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {r.reportOf}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{r.date}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 truncate" title={r.reportDocs}>
                    {r.originalFilename || r.reportDocs}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Scope: {r.processId?.processName || 'General'}</p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Panacea Certified Deliverable</span>
                <a
                  href={getFileDownloadUrl('report', r.reportDocs)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-semibold text-xs rounded-xl shadow-2xs transition flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
