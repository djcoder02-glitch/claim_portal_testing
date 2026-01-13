import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Image as ImageIcon, 
  CheckCircle, 
  Github,
  Monitor,
  Apple,
  Box
} from "lucide-react";

export const ImageGenerator = () => {
  const githubRepoUrl = "https://github.com/djcoder02-glitch/image-generator-app";
  const latestReleaseUrl = `${githubRepoUrl}/releases/latest`;

  const features = [
    "Motor and Non-Motor survey support",
    "Image editor with circles, arrows, timestamps",
    "Multiple layouts (1x1, 2x2, 3x3, 4x4)",
    "JPG and PDF export",
    "Cross-platform (Windows & Mac)"
  ];

  const downloads = [
    {
      platform: "Windows",
      icon: <Monitor className="w-5 h-5" />,
      files: [
        { name: "Setup (Installer)", file: "Photo-Sheet-Generator-Setup-1.0.0.exe", size: "73.9 MB" },
        { name: "Portable (.exe)", file: "Photo.Sheet.Generator-1.0.0.exe", size: "73.9 MB" }
      ]
    },
    {
      platform: "macOS (Intel)",
      icon: <Apple className="w-5 h-5" />,
      files: [
        { name: "DMG Installer", file: "Photo-Sheet-Generator-1.0.0-arm64.dmg", size: "91.4 MB" },
        { name: "ZIP Archive", file: "Photo-Sheet-Generator-1.0.0-arm64-mac.zip", size: "88.2 MB" }
      ]
    },
    {
      platform: "macOS (Apple Silicon)",
      icon: <Apple className="w-5 h-5" />,
      files: [
        { name: "DMG Installer", file: "Photo-Sheet-Generator-1.0.0-arm64.dmg", size: "91.4 MB" },
        { name: "ZIP Archive", file: "Photo-Sheet-Generator-1.0.0-arm64-mac.zip", size: "88.2 MB" }
      ]
    }
  ];

  const handleDownload = (filename: string) => {
    window.open(`${githubRepoUrl}/releases/download/v1.0.0/${filename}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2.5 rounded-lg">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-900">Photo Sheet Generator</h1>
                  <Badge className="bg-green-600">v1.0.0</Badge>
                </div>
                <p className="text-slate-600 mt-1">Cross-platform photo sheet generator for insurance surveys</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(githubRepoUrl, '_blank')}
              className="gap-2"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </Button>
          </div>
        </div>

        {/* Features */}
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Downloads */}
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {downloads.map((platform, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  {platform.icon}
                  <h3 className="font-semibold text-lg">{platform.platform}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {platform.files.map((file, fileIdx) => (
                    <Button
                      key={fileIdx}
                      variant="outline"
                      className="w-full justify-between h-auto py-3"
                      onClick={() => handleDownload(file.file)}
                    >
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4" />
                        <div className="text-left">
                          <div className="font-medium">{file.name}</div>
                          <div className="text-xs text-slate-500">{file.size}</div>
                        </div>
                      </div>
                      <Download className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Not sure which to download?</strong> Use the Setup/DMG installer for easy installation, 
                or the portable version if you want to run it without installing.
              </p>
            </div>

            <div className="text-center pt-4">
              <Button
                size="lg"
                onClick={() => window.open(latestReleaseUrl, '_blank')}
                className="gap-2"
              >
                <Github className="w-5 h-5" />
                View All Releases
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Installation Instructions */}
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Installation Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Windows
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
                <li>Download the Setup installer (.exe file)</li>
                <li>Run the installer and follow the installation wizard</li>
                <li>Launch Photo Sheet Generator from your Start Menu</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Apple className="w-4 h-4" />
                macOS
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 ml-2">
                <li>Download the DMG file for your Mac's chip (Intel or Apple Silicon)</li>
                <li>Open the DMG file and drag Photo Sheet Generator to Applications</li>
                <li>Launch from Applications (you may need to allow it in System Preferences → Security)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-4">
              If you encounter any issues or have questions, please visit our GitHub repository to report issues or check existing discussions.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open(`${githubRepoUrl}/issues`, '_blank')}
              className="gap-2"
            >
              <Github className="w-4 h-4" />
              Report an Issue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};