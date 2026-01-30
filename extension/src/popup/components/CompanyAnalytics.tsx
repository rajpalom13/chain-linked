import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatNumber, formatCompact, formatRelativeTime } from '../lib/utils';
import type { CompanyAnalytics as CompanyAnalyticsData } from '../../shared/types';

interface CompanyListItem {
  companyId: string;
  companyName: string;
  followers: number;
  capturedAt: number;
}

export function CompanyAnalytics() {
  const [companies, setCompanies] = useState<Record<string, CompanyAnalyticsData>>({});
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyData();
  }, []);

  async function loadCompanyData() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_COMPANY_ANALYTICS',
      });
      if (response?.success && response.data) {
        setCompanies(response.data);
        const companyIds = Object.keys(response.data);
        if (companyIds.length > 0 && !selectedCompany) {
          setSelectedCompany(companyIds[0]);
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    } finally {
      setLoading(false);
    }
  }

  const companyList: CompanyListItem[] = Object.entries(companies).map(([id, data]) => ({
    companyId: id,
    companyName: data.companyName || id,
    followers: data.followers || 0,
    capturedAt: data.capturedAt || 0,
  })).sort((a, b) => b.capturedAt - a.capturedAt);

  const selectedData = selectedCompany ? companies[selectedCompany] : null;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-slate-400">Loading company data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (companyList.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Company Analytics</CardTitle>
          <CardDescription className="text-xs">
            No company data captured yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500">
            Visit a company page on LinkedIn to capture analytics automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Company Selector */}
      {companyList.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {companyList.slice(0, 5).map((company) => (
            <Button
              key={company.companyId}
              variant={selectedCompany === company.companyId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCompany(company.companyId)}
              className="text-xs whitespace-nowrap"
            >
              {company.companyName.substring(0, 15)}
              {company.companyName.length > 15 ? '...' : ''}
            </Button>
          ))}
        </div>
      )}

      {/* Company Details */}
      {selectedData && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {selectedData.companyName}
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {formatRelativeTime(selectedData.capturedAt)}
                </Badge>
              </div>
              {selectedData.industry && (
                <CardDescription className="text-xs">
                  {selectedData.industry}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Followers</p>
                  <p className="text-2xl font-bold">{formatNumber(selectedData.followers)}</p>
                </div>
                {selectedData.employees && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Employees</p>
                    <p className="text-2xl font-bold">{formatCompact(selectedData.employees)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          {(selectedData.pageViews || selectedData.uniqueVisitors) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Page Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {selectedData.pageViews && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Page Views</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedData.pageViews)}</p>
                    </div>
                  )}
                  {selectedData.uniqueVisitors && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Unique Visitors</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedData.uniqueVisitors)}</p>
                    </div>
                  )}
                  {selectedData.customButtonClicks && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Button Clicks</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedData.customButtonClicks)}</p>
                    </div>
                  )}
                  {selectedData.updates && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase">Updates</p>
                      <p className="text-lg font-semibold">{formatNumber(selectedData.updates)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedData.headquarters && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Headquarters</span>
                  <span className="font-medium">{selectedData.headquarters}</span>
                </div>
              )}
              {selectedData.companySize && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Company Size</span>
                  <span className="font-medium">{selectedData.companySize}</span>
                </div>
              )}
              {selectedData.founded && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Founded</span>
                  <span className="font-medium">{selectedData.founded}</span>
                </div>
              )}
              {selectedData.specialties && selectedData.specialties.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedData.specialties.slice(0, 5).map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-[10px]">
                        {specialty}
                      </Badge>
                    ))}
                    {selectedData.specialties.length > 5 && (
                      <Badge variant="secondary" className="text-[10px]">
                        +{selectedData.specialties.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={loadCompanyData}
        className="w-full"
      >
        Refresh
      </Button>
    </div>
  );
}
