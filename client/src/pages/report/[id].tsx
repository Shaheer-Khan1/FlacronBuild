import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { getReportById, downloadReportPDF } from "@/lib/pdf-storage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import Header from "@/components/header";

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex mb-1 text-base">
      <span className="font-semibold w-48 text-neutral-700">{label}:</span>
      <span className="text-neutral-900">{value ?? <span className="text-neutral-400">-</span>}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold mb-4 text-blue-900 border-b pb-2 border-blue-100 tracking-tight">{title}</h2>
      <div className="p-0">
        {children}
      </div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number | undefined)[][] }) {
  return (
    <table className="min-w-full border text-xs mb-2">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="border-b px-2 py-1 text-left bg-blue-50">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="odd:bg-white even:bg-neutral-100">
            {row.map((cell, j) => (
              <td key={j} className="px-2 py-1 border-b">{cell ?? '-'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ReportDetailPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getReportById(params.id);
        setReport(data);
      } catch (e: any) {
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center">Loading report...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!report) return <div className="p-8 text-center text-neutral-500">Report not found.</div>;

  const project = report.projectData || {};
  const gemini = report.geminiResponse || {};
  const formInput = report.formInputData || project;
  const ai = gemini.response?.report || gemini.report || gemini || {};

  // Project Info
  const locationStr = typeof project.location === 'string'
    ? project.location
    : `${project.location?.city || ''}, ${project.location?.country || ''} ${project.location?.zipCode || ''}`;

  // Inspector/Insurer/Contractor/Homeowner fields
  const role = project.userRole || project.role;

  // Insurance/AI fields (if present)
  const claim = ai.claimMetadata || {};
  const summary = ai.inspectionSummary || {};
  const coverage = ai.coverageTable || {};
  const storm = ai.stormDamageAssessment || {};
  const damageTable = ai.damageClassificationsTable || ai.slopeDamage || [];
  const labor = ai.laborRequirements || {};
  const cost = ai.costEstimates || {};
  const matBreakdown = cost.materials?.breakdown || [];
  const annotatedPhotos = ai.annotatedPhotographicEvidence || ai.annotatedPhotos || [];

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto p-6 bg-gradient-to-b from-blue-50 to-white min-h-screen rounded-xl shadow-lg">
        <Card className="p-8 mb-10 relative bg-white shadow-md border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-blue-700" />
            <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">Project Report</h1>
          </div>

          <div className="space-y-2 mt-2">
            <InfoRow label="Project" value={project.name || "Unnamed"} />
            <InfoRow label="Role" value={role || "-"} />
            <InfoRow label="Location" value={locationStr} />
            <InfoRow label="Date" value={report.timestamp ? new Date(report.timestamp).toLocaleString() : "-"} />
          </div>
          {report.pdfRef && (
            <Button className="mt-6" onClick={() => downloadReportPDF(report)}>
              <Download className="h-4 w-4 mr-1" /> Download PDF
            </Button>
          )}
        </Card>

        <Section title="Project Info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <InfoRow label="Structure Type" value={formInput.structureType} />
            <InfoRow label="Roof Pitch" value={formInput.roofPitch} />
            <InfoRow label="Roof Age" value={formInput.roofAge} />
            <InfoRow label="Material Layers" value={Array.isArray(formInput.materialLayers) ? formInput.materialLayers.join(', ') : formInput.materialLayers} />
            <InfoRow label="Felt" value={formInput.felt} />
            <InfoRow label="Ice/Water Shield" value={formInput.iceWaterShield ? 'Yes' : 'No'} />
            <InfoRow label="Drip Edge" value={formInput.dripEdge ? 'Yes' : 'No'} />
            <InfoRow label="Gutter Apron" value={formInput.gutterApron ? 'Yes' : 'No'} />
            <InfoRow label="Area" value={formInput.area} />
            <InfoRow label="Urgency" value={formInput.urgency} />
            {formInput.inspectorInfo && (
              <>
                <InfoRow label="Inspector Name" value={formInput.inspectorInfo.name} />
                <InfoRow label="Inspector License" value={formInput.inspectorInfo.license} />
                <InfoRow label="Inspector Contact" value={formInput.inspectorInfo.contact} />
              </>
            )}
            {formInput.claimNumber && <InfoRow label="Claim Number" value={formInput.claimNumber} />}
            {formInput.policyholderName && <InfoRow label="Policyholder Name" value={formInput.policyholderName} />}
            {formInput.adjusterName && <InfoRow label="Adjuster Name" value={formInput.adjusterName} />}
            {formInput.adjusterContact && <InfoRow label="Adjuster Contact" value={formInput.adjusterContact} />}
            {formInput.dateOfLoss && <InfoRow label="Date of Loss" value={formInput.dateOfLoss} />}
            {formInput.damageCause && <InfoRow label="Damage Cause" value={formInput.damageCause} />}
            {formInput.jobType && <InfoRow label="Job Type" value={formInput.jobType} />}
            {formInput.materialPreference && <InfoRow label="Material Preference" value={formInput.materialPreference} />}
            {formInput.laborNeeds && (
              <>
                <InfoRow label="Worker Count" value={formInput.laborNeeds.workerCount} />
                <InfoRow label="Steep Assist" value={formInput.laborNeeds.steepAssist ? 'Yes' : 'No'} />
              </>
            )}
            {formInput.lineItems && Array.isArray(formInput.lineItems) && formInput.lineItems.length > 0 && (
              <InfoRow label="Line Items" value={formInput.lineItems.join(', ')} />
            )}
            {formInput.homeownerInfo && (
              <>
                <InfoRow label="Homeowner Name" value={formInput.homeownerInfo.name} />
                <InfoRow label="Homeowner Email" value={formInput.homeownerInfo.email} />
              </>
            )}
          </div>
        </Section>

        {report.imageAnalysis && Array.isArray(report.imageAnalysis) && (
          <Section title="Image Analysis">
            <ul className="list-disc pl-6">
              {report.imageAnalysis.map((desc: string, i: number) => (
                <li key={i}>{desc}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
} 