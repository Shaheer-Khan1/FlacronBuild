import { useState, useEffect } from "react";
import Header from "@/components/header";
import EstimationForm from "@/components/estimation-form";
import { Hammer, Home, HardHat, ClipboardCheck, Shield, CheckCircle, ArrowRight, FileText, Download } from "lucide-react";
import FlacronBuildLogo from "../FlacronBuildLogo.webp";
import { userRoleManager, type UserRole } from "@/lib/user-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import LiveScrapingTest from "@/components/live-scraping-test";

export default function Dashboard() {
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Get current user role
    const role = userRoleManager.getUserRole();
    setUserRole(role);

    // Subscribe to role changes
    const unsubscribe = userRoleManager.onRoleChange((newRole) => {
      setUserRole(newRole);
    });

    return unsubscribe;
  }, []);

  const renderRoleBasedDashboard = () => {
    if (!userRole) {
      return (
        <div className="max-w-xl w-full mx-auto">
          <Card className="text-center p-8">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-700">Welcome to FlacronBuild</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Please complete your subscription to access your personalized dashboard.
              </p>
              <Button onClick={() => window.location.href = "/"} className="w-full">
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const roleDisplayName = userRoleManager.getRoleDisplayName(userRole);
    const roleDescription = userRoleManager.getRoleDescription(userRole);
    const roleFeatures = userRoleManager.getRoleFeatures(userRole);

    return (
      <div className="space-y-8">
        {/* Role Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="text-4xl mr-3">{roleDisplayName.split(' ')[0]}</div>
            <h1 className="text-3xl font-bold text-gray-900">{roleDisplayName.split(' ').slice(1).join(' ')} Dashboard</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {roleDescription}
          </p>
        </div>

        {/* Role Features */}
        <div className="max-w-xl w-full mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Your Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roleFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estimation Form */}
        <div className="max-w-xl w-full mx-auto">
          <EstimationForm 
            onProjectUpdate={setCurrentProject}
            onEstimateUpdate={setCurrentEstimate}
            hasEstimate={!!currentEstimate}
            disableRoleSelection={true}
          />
        </div>

        {/* Generate Report Section - Centered */}
        {currentEstimate && (
          <div className="max-w-xl w-full mx-auto">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="flex items-center justify-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-500" />
                  Generate Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Your estimate has been generated successfully. You can now create a detailed PDF report.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => {
                      if (currentProject && currentEstimate) {
                        const { generatePDFReport } = require('@/lib/pdf-generator');
                        generatePDFReport(currentProject, currentEstimate, { 
                          openInNewTab: true,
                          username: 'User'
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (currentProject && currentEstimate) {
                        const { generatePDFReport } = require('@/lib/pdf-generator');
                        generatePDFReport(currentProject, currentEstimate, { 
                          openInNewTab: false,
                          username: 'User'
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Role-Specific Quick Actions - Centered */}
        <div className="max-w-2xl w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userRole === "homeowner" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Home className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Quick Estimate</h3>
                    <p className="text-sm text-gray-600">Get a basic cost estimate</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Hammer className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Budget Planning</h3>
                    <p className="text-sm text-gray-600">Plan your roofing budget</p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === "contractor" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <HardHat className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Detailed Estimate</h3>
                    <p className="text-sm text-gray-600">Create professional bids</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <ArrowRight className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Bid Reports</h3>
                    <p className="text-sm text-gray-600">Generate bid-ready reports</p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === "inspector" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <ClipboardCheck className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Inspection Report</h3>
                    <p className="text-sm text-gray-600">Create detailed inspections</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Certification</h3>
                    <p className="text-sm text-gray-600">Generate certified reports</p>
                  </CardContent>
                </Card>
              </>
            )}

            {userRole === "insurance-adjuster" && (
              <>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Claim Analysis</h3>
                    <p className="text-sm text-gray-600">Analyze insurance claims</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Coverage Review</h3>
                    <p className="text-sm text-gray-600">Review policy coverage</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex flex-col items-center justify-center">
          <div className="flex items-center mb-2">
            <div style={{ height: 90, width: 300, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={FlacronBuildLogo} 
                alt="FlacronBuild Logo" 
                style={{ height: 220, width: 'auto', objectFit: 'cover', objectPosition: 'center' }} 
              />
            </div>
          </div>
          {!userRole && (
            <div className="text-neutral-600 text-base text-center max-w-2xl">
              AI-powered roofing cost estimation with professional reports for homeowners, contractors, inspectors, and insurance adjusters. Get accurate, data-driven estimates for roof repairs, replacements, and maintenance.
            </div>
          )}
        </div>
        
        {!userRole && (
          <div className="mb-8 text-center text-base text-neutral-600 bg-neutral-100 rounded-lg py-3 px-4">
            <strong>Note:</strong> This tool provides professional roofing cost estimates based on current market data and material prices. Actual costs can vary ±15% depending on local conditions, material availability, and contractor rates. Most accurate for properties in the United States.
          </div>
        )}

        {renderRoleBasedDashboard()}
        
        <div className="mt-12 space-y-8">
          {/* <LiveScrapingTest /> */}
        </div>
      </div>
    </div>
  );
}
