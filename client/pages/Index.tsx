import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Layers,
  Search,
  Download,
  Maximize2,
  MoreVertical,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  name: string;
  type: "product" | "bill_child" | "nested_child";
  children?: TreeNode[];
  isExpanded?: boolean;
}

const mockData: TreeNode[] = [
  {
    id: "gfs",
    name: "GFS (Global Forecast System)",
    type: "product",
    children: [
      {
        id: "gfs-temperature",
        name: "Temperature Analysis",
        type: "bill_child",
        children: [
          {
            id: "gfs-temp-surface",
            name: "Surface Temperature",
            type: "nested_child",
          },
          { id: "gfs-temp-2m", name: "2m Temperature", type: "nested_child" },
          {
            id: "gfs-temp-upper",
            name: "Upper Level Temperature",
            type: "nested_child",
          },
        ],
      },
      {
        id: "gfs-precipitation",
        name: "Precipitation Forecast",
        type: "bill_child",
        children: [
          {
            id: "gfs-precip-total",
            name: "Total Precipitation",
            type: "nested_child",
          },
          {
            id: "gfs-precip-rate",
            name: "Precipitation Rate",
            type: "nested_child",
          },
        ],
      },
      {
        id: "gfs-wind",
        name: "Wind Analysis",
        type: "bill_child",
        children: [
          { id: "gfs-wind-speed", name: "Wind Speed", type: "nested_child" },
          {
            id: "gfs-wind-direction",
            name: "Wind Direction",
            type: "nested_child",
          },
          { id: "gfs-wind-gust", name: "Wind Gust", type: "nested_child" },
        ],
      },
    ],
  },
  {
    id: "wrf",
    name: "WRF (Weather Research and Forecasting)",
    type: "product",
    children: [
      {
        id: "wrf-high-res",
        name: "High Resolution Forecast",
        type: "bill_child",
        children: [
          {
            id: "wrf-temp-detailed",
            name: "Detailed Temperature",
            type: "nested_child",
          },
          {
            id: "wrf-precip-detailed",
            name: "Detailed Precipitation",
            type: "nested_child",
          },
        ],
      },
      {
        id: "wrf-ensemble",
        name: "Ensemble Forecast",
        type: "bill_child",
        children: [
          { id: "wrf-ens-mean", name: "Ensemble Mean", type: "nested_child" },
          {
            id: "wrf-ens-spread",
            name: "Ensemble Spread",
            type: "nested_child",
          },
        ],
      },
    ],
  },
  {
    id: "imd",
    name: "IMD (India Meteorological Department)",
    type: "product",
    children: [
      {
        id: "imd-monsoon",
        name: "Monsoon Analysis",
        type: "bill_child",
        children: [
          {
            id: "imd-monsoon-onset",
            name: "Monsoon Onset",
            type: "nested_child",
          },
          {
            id: "imd-monsoon-withdraw",
            name: "Monsoon Withdrawal",
            type: "nested_child",
          },
        ],
      },
      {
        id: "imd-cyclone",
        name: "Cyclone Tracking",
        type: "bill_child",
        children: [
          {
            id: "imd-cyclone-track",
            name: "Cyclone Track",
            type: "nested_child",
          },
          {
            id: "imd-cyclone-intensity",
            name: "Cyclone Intensity",
            type: "nested_child",
          },
        ],
      },
    ],
  },
];

const forecastHours = [
  "0",
  "6",
  "12",
  "18",
  "24",
  "48",
  "72",
  "96",
  "120",
  "144",
  "168",
];
const hpaLevels = [
  "1000hPa",
  "925hPa",
  "850hPa",
  "700hPa",
  "500hPa",
  "300hPa",
  "250hPa",
  "200hPa",
  "100hPa",
];

// Download image function
const downloadImage = async (imageUrl: string, filename: string) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download failed:", error);
    // Fallback: open image in new tab
    window.open(imageUrl, "_blank");
  }
};

// Dummy image mapping based on selections
const getImageUrl = (nodeId: string, date: Date, hour: string, hpa: string) => {
  const images = [
    "https://nwp.ncmrwf.gov.in/Data/mihir/2025-07-16/00/UM-Reg4Km/Wind-Forecast/reg_pf0_200.png",
    "https://nwp.ncmrwf.gov.in/Data/mihir/2025-07-16/00/UM-Reg4Km/Rain-Forecast/reg_rf1.png",
    "https://nwp.ncmrwf.gov.in/Obs_Temp/imd_obs7_Tmax.png",
  ];

  // Simple mapping logic - in real app this would be more sophisticated
  if (nodeId.includes("wind") || nodeId.includes("gfs-wind")) {
    return images[0]; // Wind forecast
  } else if (
    nodeId.includes("precipitation") ||
    nodeId.includes("precip") ||
    nodeId.includes("rain")
  ) {
    return images[1]; // Rain forecast
  } else if (
    nodeId.includes("temperature") ||
    nodeId.includes("temp") ||
    nodeId.includes("imd")
  ) {
    return images[2]; // Temperature observation
  }

  // Default rotation based on hour
  const hourIndex = parseInt(hour) % images.length;
  return images[hourIndex];
};

export default function Index() {
  const { theme, setTheme } = useTheme();
  const [treeData, setTreeData] = useState<TreeNode[]>(mockData);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<string>("0");
  const [selectedHpa, setSelectedHpa] = useState<string>("1000hPa");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleNode = (nodeId: string, nodes: TreeNode[]): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      if (node.children) {
        return { ...node, children: toggleNode(nodeId, node.children) };
      }
      return node;
    });
  };

  const handleNodeToggle = (nodeId: string) => {
    setTreeData((prevData) => toggleNode(nodeId, prevData));
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNode(node);
    setIsImageLoading(true);
    // Simulate image loading
    setTimeout(() => {
      setIsImageLoading(false);
    }, 1500);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const canExpand =
      hasChildren && (node.type === "product" || node.type === "bill_child");

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center py-2 px-2 rounded-md cursor-pointer transition-colors",
            "hover:bg-primary-foreground/10",
            selectedNode?.id === node.id &&
              "bg-accent text-accent-foreground border-l-2 border-accent",
            level > 0 && "ml-4",
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {canExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-2"
              onClick={(e) => {
                e.stopPropagation();
                handleNodeToggle(node.id);
              }}
            >
              {node.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!canExpand && <div className="w-6 mr-2" />}

          <div
            className="flex-1 text-sm"
            onClick={() => handleNodeSelect(node)}
          >
            <span
              className={cn(
                selectedNode?.id === node.id
                  ? "text-accent-foreground"
                  : node.type === "product" &&
                      "font-semibold text-primary-foreground",
                selectedNode?.id === node.id
                  ? "text-accent-foreground"
                  : node.type === "bill_child" &&
                      "font-medium text-primary-foreground/90",
                selectedNode?.id === node.id
                  ? "text-accent-foreground"
                  : node.type === "nested_child" &&
                      "text-primary-foreground/70",
              )}
            >
              {node.name}
            </span>
          </div>
        </div>

        {node.isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTreeData = treeData.filter((node) =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const currentImageUrl = selectedNode
    ? getImageUrl(selectedNode.id, selectedDate, selectedHour, selectedHpa)
    : "";
  const imageFilename = selectedNode
    ? `${selectedNode.name.replace(/\s+/g, "_")}_${format(selectedDate, "yyyy-MM-dd")}_${selectedHour}h_${selectedHpa}.png`
    : "forecast_image.png";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-accent text-accent-foreground">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              MeteoViz Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Environmental Forecasting & Data Visualization Platform
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Search className="h-4 w-4 mr-2" />
              Quick Search
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Toggle Theme</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)] relative">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Tree Navigation */}
        <div
          className={cn(
            "w-80 border-r transition-transform duration-300 ease-in-out lg:translate-x-0",
            "lg:relative absolute inset-y-0 left-0 z-50",
            "bg-primary text-primary-foreground",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="p-4 border-b border-primary-foreground/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
            </div>
          </div>

          <div className="p-4 overflow-y-auto h-full">
            <div className="space-y-1">
              {filteredTreeData.map((node) => renderTreeNode(node))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {selectedNode ? (
            <>
              {/* Filter Controls */}
              <div className="border-b bg-secondary p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedNode.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Configure filters to display forecast data
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Forecast Date
                    </label>
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(selectedDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                              setIsCalendarOpen(false);
                              if (selectedNode) {
                                setIsImageLoading(true);
                                setTimeout(
                                  () => setIsImageLoading(false),
                                  1000,
                                );
                              }
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Forecast Hour */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Forecast Hour
                    </label>
                    <Select
                      value={selectedHour}
                      onValueChange={(value) => {
                        setSelectedHour(value);
                        if (selectedNode) {
                          setIsImageLoading(true);
                          setTimeout(() => setIsImageLoading(false), 1000);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {forecastHours.map((hour) => (
                          <SelectItem key={hour} value={hour}>
                            {hour}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* HPA Level */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Pressure Level
                    </label>
                    <Select
                      value={selectedHpa}
                      onValueChange={(value) => {
                        setSelectedHpa(value);
                        if (selectedNode) {
                          setIsImageLoading(true);
                          setTimeout(() => setIsImageLoading(false), 1000);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hpaLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Image Display Area */}
              <div className="flex-1 p-2 bg-muted/30 overflow-hidden">
                <Card className="h-full bg-card border-2 border-primary/20 flex flex-col">
                  <CardHeader className="pb-3 flex-shrink-0">
                    <CardTitle className="flex items-center justify-between">
                      <span>Forecast Visualization</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 p-0 overflow-hidden">
                    <div className="h-full bg-primary/5 border border-primary/20 rounded-lg relative flex flex-col">
                      {isImageLoading ? (
                        /* Loading State */
                        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-10">
                          <div className="text-center">
                            <div className="w-24 h-24 bg-accent/30 rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
                              <Layers className="h-12 w-12 text-accent animate-spin" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">
                              Loading Forecast Data...
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Processing {selectedNode.name} visualization
                            </p>
                            <div className="space-y-2">
                              <div className="h-2 bg-primary/20 rounded-full animate-pulse" />
                              <div className="h-2 bg-primary/20 rounded-full animate-pulse w-3/4 mx-auto" />
                              <div className="h-2 bg-primary/20 rounded-full animate-pulse w-1/2 mx-auto" />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Actual meteorological forecast image */}
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
                          <img
                            src={getImageUrl(
                              selectedNode.id,
                              selectedDate,
                              selectedHour,
                              selectedHpa,
                            )}
                            alt={`${selectedNode.name} - ${format(selectedDate, "MMM dd, yyyy")} - ${selectedHour}h - ${selectedHpa}`}
                            className="w-full h-full object-contain rounded-md shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                            style={{
                              maxHeight: "calc(100vh - 240px)",
                              minHeight: "300px",
                            }}
                            onClick={() => setIsFullscreen(true)}
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.parentElement?.querySelector(
                                  ".fallback-placeholder",
                                ) as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          {/* Fallback placeholder */}
                          <div className="fallback-placeholder hidden flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-accent/30 rounded-full flex items-center justify-center mb-4 mx-auto">
                              <Layers className="h-12 w-12 text-accent" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">
                              Image Unavailable
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Unable to load forecast visualization
                            </p>
                            <div className="space-y-2 text-xs text-muted-foreground">
                              <p>Selected: {selectedNode.name}</p>
                              <p>Date: {format(selectedDate, "yyyy-MM-dd")}</p>
                              <p>Hour: +{selectedHour} hours</p>
                              <p>Level: {selectedHpa}</p>
                            </div>
                          </div>
                        </div>

                        {/* Image info footer */}
                        <div className="bg-card/90 backdrop-blur-sm border-t p-2 flex-shrink-0">
                          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                            <div className="flex flex-wrap gap-3">
                              <span className="font-medium text-foreground">
                                {selectedNode.name}
                              </span>
                              <span>
                                {format(selectedDate, "MMM dd, yyyy")}
                              </span>
                              <span>+{selectedHour}h</span>
                              <span>{selectedHpa}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() =>
                                  downloadImage(currentImageUrl, imageFilename)
                                }
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setIsFullscreen(true)}
                              >
                                <Maximize2 className="h-3 w-3 mr-1" />
                                Full
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            /* Welcome State */
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 bg-accent/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <Layers className="h-12 w-12 text-accent" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Welcome to MeteoViz Dashboard
                </h2>
                <p className="text-muted-foreground mb-6">
                  Select a product from the navigation tree to explore
                  meteorological forecast data with advanced filtering options.
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Browse GFS, WRF, and IMD forecast products</p>
                  <p>• Apply date, time, and pressure level filters</p>
                  <p>• View high-resolution forecast visualizations</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {isFullscreen && selectedNode && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
              <div className="text-white">
                <h2 className="text-lg font-semibold">{selectedNode.name}</h2>
                <p className="text-sm text-white/70">
                  {format(selectedDate, "MMM dd, yyyy")} | +{selectedHour}h |{" "}
                  {selectedHpa}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(currentImageUrl, imageFilename)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Fullscreen Image */}
            <div className="flex-1 flex items-center justify-center p-4">
              <img
                src={currentImageUrl}
                alt={`${selectedNode.name} - ${format(selectedDate, "MMM dd, yyyy")} - ${selectedHour}h - ${selectedHpa}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>

            {/* Click outside to close */}
            <div
              className="absolute inset-0 -z-10"
              onClick={() => setIsFullscreen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
