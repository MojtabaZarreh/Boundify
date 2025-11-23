
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { BoundingBox, Class, ImageObject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Lock,
  Plus,
  Trash2,
  UploadCloud,
  ZoomIn,
  ZoomOut,
  MousePointer2,
} from "lucide-react";
import JSZip from "jszip";
import { useToast } from "@/hooks/use-toast";
import { LogoIcon } from "./icons/LogoIcon";

const CLASS_COLORS = [
  "#38BDF8", "#F87171", "#4ADE80", "#FACC15", "#A78BFA", "#F472B6",
  "#2DD4BF", "#FB923C", "#A3E635", "#C084FC",
];

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const RESIZE_HANDLE_SIZE = 8;

export function Annotator() {
  const { toast } = useToast();
  const [images, setImages] = useState<ImageObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<string, BoundingBox[]>>({});
  const [classes, setClasses] = useState<Class[]>([
    // { id: 1, name: "Object", color: CLASS_COLORS[0] },
  ]);
  const [activeClassId, setActiveClassId] = useState<number | null>(1);
  const [newClassName, setNewClassName] = useState("");
  const [mode, setMode] = useState<"edit" | "lock">("edit");
  const [modelUrl, setModelUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [transform, setTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<any>(null); // drawing, moving, resizing
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newImageObjects: ImageObject[] = [];
    let loadedCount = 0;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          newImageObjects.push({
            file,
            objectURL: img.src,
            width: img.width,
            height: img.height,
          });
          loadedCount++;
          if (loadedCount === imageFiles.length) {
            setImages(prev => [...prev, ...newImageObjects]);
            if (images.length === 0) {
              setCurrentIndex(0);
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    event.target.value = ''; // Reset file input
  };

  const getNextClassId = useCallback(() => {
    return (classes.length > 0 ? Math.max(...classes.map(c => c.id)) : 0) + 1;
  }, [classes]);

  const fetchAnnotations = useCallback(async (imageIndex: number) => {
    const currentImage = images[imageIndex];
    if (!modelUrl || !currentImage || annotations.hasOwnProperty(currentImage.file.name)) {
      return;
    }

    setIsLoading(true);
    try {
        const formData = new FormData();
        formData.append('file', currentImage.file);

        let url = modelUrl;
        if (apiKey) {
            url += `${modelUrl.includes('?') ? '&' : '?'}api_key=${apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const { predictions } = data;

        if (!predictions) {
            toast({ title: "No predictions found in API response.", variant: "destructive" });
            setAnnotations(prev => ({ ...prev, [currentImage.file.name]: [] })); // Mark as processed
            setIsLoading(false);
            return;
        }

        if (predictions.length === 0) {
            toast({ title: "No objects detected by the model." });
            setAnnotations(prev => ({ ...prev, [currentImage.file.name]: [] }));
            setIsLoading(false);
            return;
        }

        let newClassesCreated = false;
        let tempClasses = [...classes];
        
        const newBoxes: BoundingBox[] = predictions.map((pred: any) => {
            let nextId = (tempClasses.length > 0 ? Math.max(...tempClasses.map(c => c.id)) : 0) + 1;
            let cls = tempClasses.find(c => c.name === pred.class);
            if (!cls) {
                cls = {
                    id: nextId,
                    name: pred.class,
                    color: CLASS_COLORS[nextId % CLASS_COLORS.length],
                };
                tempClasses.push(cls);
                newClassesCreated = true;
            }

            return {
                id: `${pred.detection_id || 'pred'}-${Math.random().toString(36).substr(2, 9)}`,
                classId: cls.id,
                x: pred.x - pred.width / 2,
                y: pred.y - pred.height / 2,
                width: pred.width,
                height: pred.height,
            };
        });

        setAnnotations(prev => ({ ...prev, [currentImage.file.name]: newBoxes }));
        
        if (newClassesCreated) {
            setClasses(tempClasses);
        }

        toast({ title: "Annotations loaded from model." });
    } catch (error: any) {
        setAnnotations(prev => ({ ...prev, [currentImage.file.name]: [] })); // Mark as processed on error
        toast({ title: "Failed to load model annotations.", description: error.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [modelUrl, apiKey, images, annotations, toast, classes]);

  useEffect(() => {
    if (mode === 'lock' && images.length > 0 && images[currentIndex]) {
      fetchAnnotations(currentIndex);
    }
  }, [currentIndex, mode, images, fetchAnnotations]);


  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'edit' : 'lock';
    setMode(newMode);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;

    if (!canvas || !ctx || !container) return;
    
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);
    
    const currentImage = imageRef.current;
    if (currentImage) {
        ctx.drawImage(currentImage, 0, 0);
        
        const currentImageAnns = annotations[images[currentIndex]?.file.name] || [];
        
        currentImageAnns.forEach(box => {
            const cls = classes.find(c => c.id === box.classId);
            if (!cls) return;

            ctx.strokeStyle = cls.color;
            ctx.fillStyle = `${cls.color}20`; // 12.5% opacity
            ctx.lineWidth = 2 / transform.scale;
            
            if (hoveredBoxId === box.id) {
                ctx.fillStyle = `${cls.color}40`; // 25% opacity
            }
            
            ctx.fillRect(box.x, box.y, box.width, box.height);
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw label
            const label = cls.name;
            ctx.fillStyle = cls.color;
            const textMetrics = ctx.measureText(label);
            const textHeight = 20 / transform.scale;
            ctx.fillRect(box.x, box.y - textHeight, textMetrics.width + 8 / transform.scale, textHeight);
            
            ctx.fillStyle = "white";
            ctx.font = `${14 / transform.scale}px Inter, sans-serif`;
            ctx.fillText(label, box.x + 4 / transform.scale, box.y - 4 / transform.scale);

            // Draw resize handles
            if (hoveredBoxId === box.id) {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                const handleSize = RESIZE_HANDLE_SIZE / transform.scale;
                const handles = getResizeHandles(box);
                handles.forEach(h => {
                    ctx.strokeRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
                    ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
                });
            }
        });

        // Draw interaction
        if (interaction?.type === 'drawing') {
            ctx.strokeStyle = classes.find(c => c.id === activeClassId)?.color || "#000000";
            ctx.lineWidth = 2 / transform.scale;
            ctx.setLineDash([5 / transform.scale, 5 / transform.scale]);
            ctx.strokeRect(interaction.x, interaction.y, interaction.width, interaction.height);
            ctx.setLineDash([]);
        }
    }
    ctx.restore();
  }, [annotations, currentIndex, images, transform, classes, activeClassId, interaction, hoveredBoxId]);
  
  useEffect(() => {
    if (images.length > 0 && images[currentIndex]) {
        const img = new Image();
        img.src = images[currentIndex].objectURL;
        img.onload = () => {
            imageRef.current = img;
            redrawCanvas();
        };
    } else {
        imageRef.current = null;
        redrawCanvas();
    }
  }, [images, currentIndex, redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [transform, redrawCanvas, annotations]);

  useEffect(() => {
    const handleResize = () => redrawCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redrawCanvas]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.offsetX) / transform.scale;
    const y = (e.clientY - rect.top - transform.offsetY) / transform.scale;
    return { x, y };
  };

  const getResizeHandles = (box: BoundingBox) => {
    return [
        { x: box.x, y: box.y, cursor: 'nwse-resize', type: 'tl' },
        { x: box.x + box.width, y: box.y, cursor: 'nesw-resize', type: 'tr' },
        { x: box.x, y: box.y + box.height, cursor: 'nesw-resize', type: 'bl' },
        { x: box.x + box.width, y: box.y + box.height, cursor: 'nwse-resize', type: 'br' },
        { x: box.x + box.width/2, y: box.y, cursor: 'ns-resize', type: 't' },
        { x: box.x + box.width/2, y: box.y + box.height, cursor: 'ns-resize', type: 'b' },
        { x: box.x, y: box.y + box.height/2, cursor: 'ew-resize', type: 'l' },
        { x: box.x + box.width, y: box.y + box.height/2, cursor: 'ew-resize', type: 'r' },
    ];
  };

  const getInteractionForPos = (pos: {x: number, y: number}) => {
    const currentAnns = annotations[images[currentIndex]?.file.name] || [];
    for (let i = currentAnns.length - 1; i >= 0; i--) {
        const box = currentAnns[i];
        
        // Check resize handles first
        const handles = getResizeHandles(box);
        for(const handle of handles) {
            const handleSize = RESIZE_HANDLE_SIZE / transform.scale;
            if (pos.x >= handle.x - handleSize/2 && pos.x <= handle.x + handleSize/2 &&
                pos.y >= handle.y - handleSize/2 && pos.y <= handle.y + handleSize/2) {
                return { type: 'resizing', boxId: box.id, handle: handle.type, cursor: handle.cursor };
            }
        }
        
        // Check box body
        if (pos.x >= box.x && pos.x <= box.x + box.width &&
            pos.y >= box.y && pos.y <= box.y + box.height) {
            return { type: 'moving', boxId: box.id, cursor: 'move' };
        }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const pos = getMousePos(e);

    const currentInteraction = getInteractionForPos(pos);
    
    if (currentInteraction) {
        setInteraction({ ...currentInteraction, startPos: pos, originalBox: annotations[images[currentIndex].file.name].find(b => b.id === (currentInteraction as any).boxId) });
    } else if(mode === 'edit' && activeClassId) {
        setInteraction({ type: 'drawing', startPos: pos, x: pos.x, y: pos.y, width: 0, height: 0 });
    } else {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (interaction) {
        if (interaction.type === 'drawing') {
            setInteraction({ ...interaction, width: pos.x - interaction.startPos.x, height: pos.y - interaction.startPos.y });
        }
        else if(interaction.type === 'moving') {
            const dx = pos.x - interaction.startPos.x;
            const dy = pos.y - interaction.startPos.y;
            const updatedBox = { ...interaction.originalBox, x: interaction.originalBox.x + dx, y: interaction.originalBox.y + dy };
            updateAnnotation(updatedBox);
        } else if(interaction.type === 'resizing') {
            const { originalBox, handle } = interaction;
            let { x, y, width, height } = originalBox;
            const dx = pos.x - interaction.startPos.x;
            const dy = pos.y - interaction.startPos.y;

            if (handle.includes('l')) { x += dx; width -= dx; }
            if (handle.includes('r')) { width += dx; }
            if (handle.includes('t')) { y += dy; height -= dy; }
            if (handle.includes('b')) { height += dy; }
            
            if (width < 0) { x += width; width = -width; }
            if (height < 0) { y += height; height = -height; }
            
            updateAnnotation({ ...originalBox, x, y, width, height });
        }
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setTransform(t => ({ ...t, offsetX: t.offsetX + dx, offsetY: t.offsetY + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else { // Hovering
        const currentInteraction = getInteractionForPos(pos);
        if (mode === 'lock') {
            canvas.style.cursor = currentInteraction?.cursor || 'grab';
        } else {
            canvas.style.cursor = currentInteraction?.cursor || 'crosshair';
        }
        
        const currentAnns = annotations[images[currentIndex]?.file.name] || [];
        const hovered = currentAnns.find(box => 
            pos.x >= box.x && pos.x <= box.x + box.width &&
            pos.y >= box.y && pos.y <= box.y + box.height
        );
        setHoveredBoxId(hovered ? hovered.id : null);
    }
  };

  const handleMouseUp = () => {
    if (interaction?.type === 'drawing') {
        const { startPos } = interaction;
        const endPos = { x: interaction.x + interaction.width, y: interaction.y + interaction.height };
        
        const newBox: BoundingBox = {
            id: Date.now().toString(),
            classId: activeClassId!,
            x: Math.min(startPos.x, endPos.x),
            y: Math.min(startPos.y, endPos.y),
            width: Math.abs(interaction.width),
            height: Math.abs(interaction.height),
        };

        if (newBox.width > 5 && newBox.height > 5) {
            addAnnotation(newBox);
        }
    }
    setIsDragging(false);
    setInteraction(null);
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleAmount = 1 - e.deltaY * 0.001;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, transform.scale * scaleAmount));
    
    const newOffsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
    const newOffsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);
    
    setTransform({ scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY });
  };
  
  const addAnnotation = (box: BoundingBox) => {
    const key = images[currentIndex].file.name;
    setAnnotations(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), box],
    }));
  };

  const updateAnnotation = (updatedBox: BoundingBox) => {
    const key = images[currentIndex].file.name;
    setAnnotations(prev => ({
        ...prev,
        [key]: (prev[key] || []).map(b => b.id === updatedBox.id ? updatedBox : b),
    }));
  };

  const deleteAnnotation = (id: string) => {
    const key = images[currentIndex].file.name;
    setAnnotations(prev => ({
        ...prev,
        [key]: (prev[key] || []).filter(b => b.id !== id),
    }));
  };

  const handleAddNewClass = () => {
    if (newClassName.trim() === "") return;
    const newId = getNextClassId();
    const newClass: Class = {
        id: newId,
        name: newClassName.trim(),
        color: CLASS_COLORS[newId % CLASS_COLORS.length],
    };
    setClasses([...classes, newClass]);
    setNewClassName("");
    setActiveClassId(newId);
  };

  const handleDownload = () => {
    const zip = new JSZip();
    const imageKeys = Object.keys(annotations);

    if (imageKeys.length === 0) {
      toast({ title: "No annotations to download.", variant: "destructive" });
      return;
    }
    
    imageKeys.forEach(imageName => {
        const image = images.find(img => img.file.name === imageName);
        if (!image) return;

        const yoloStrings = annotations[imageName].map(box => {
            const x_center = (box.x + box.width / 2) / image.width;
            const y_center = (box.y + box.height / 2) / image.height;
            const width = box.width / image.width;
            const height = box.height / image.height;
            const classIndex = classes.findIndex(c => c.id === box.classId);
            return `${classIndex} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
        });
        const yoloData = yoloStrings.join('\n');
        zip.file(`${image.file.name.split('.').slice(0, -1).join('.')}.txt`, yoloData);
    });

    zip.generateAsync({type: "blob"}).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "annotations.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Annotations downloaded.", description: "A zip file with YOLO format .txt files has been created." });
    });
  };

  const resetZoom = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const imageWidth = imageRef.current.width;
    const imageHeight = imageRef.current.height;

    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY) * 0.95;

    const offsetX = (containerWidth - imageWidth * scale) / 2;
    const offsetY = (containerHeight - imageHeight * scale) / 2;
    setTransform({ scale, offsetX, offsetY });
  }, []);

  return (
    <TooltipProvider>
      <div className="h-svh w-screen bg-background text-foreground grid grid-cols-1 md:grid-cols-[1fr_380px]">
        {/* Main Canvas Area */}
        <main ref={containerRef} className="relative h-full w-full bg-muted/30 flex items-center justify-center overflow-hidden" onWheel={handleWheel}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {(images.length === 0 || isLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-muted-foreground bg-black/20 backdrop-blur-sm">
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="mt-4">Loading model predictions...</p>
                    </>
                ) : (
                    <>
                        <UploadCloud className="w-16 h-16 mb-4" />
                        <h2 className="text-2xl font-semibold">Upload Images</h2>
                        <p>Click the "Upload Images" button to start annotating.</p>
                    </>
                )}
            </div>
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setTransform(t => ({...t, scale: t.scale * 1.2}))}><ZoomIn /></Button>
            <Button variant="outline" size="icon" onClick={() => setTransform(t => ({...t, scale: t.scale / 1.2}))}><ZoomOut /></Button>
            <Button variant="outline" size="icon" onClick={resetZoom}><MousePointer2 /></Button>
          </div>
        </main>
        
        {/* Control Panel */}
        <aside className="h-full flex flex-col border-l bg-background/80 backdrop-blur-xl">
          <div className="p-4 border-b flex items-center gap-3">
            <LogoIcon className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold">Boundify Annotator</h1>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Image Management */}
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                    <UploadCloud className="mr-2" /> Upload Images
                  </Button>
                  {images.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <Button variant="outline" size="icon" onClick={() => setCurrentIndex(p => Math.max(0, p - 1))} disabled={currentIndex === 0}><ChevronLeft /></Button>
                      <p className="text-sm font-medium">
                        {currentIndex + 1} / {images.length}
                      </p>
                      <Button variant="outline" size="icon" onClick={() => setCurrentIndex(p => Math.min(images.length - 1, p + 1))} disabled={currentIndex === images.length - 1}><ChevronRight /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Class Management */}
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="New class name" 
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddNewClass()}
                    />
                    <Button onClick={handleAddNewClass}><Plus/></Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {classes.map(cls => (
                      <Button 
                        key={cls.id} 
                        variant={activeClassId === cls.id ? "default" : "secondary"}
                        onClick={() => setActiveClassId(cls.id)}
                        className="flex items-center gap-2"
                      >
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: cls.color}}></span>
                        {cls.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bounding Boxes */}
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Annotations</CardTitle>
                </CardHeader>
                <CardContent className="h-40">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-3">
                      {(annotations[images[currentIndex]?.file.name] || []).map(box => {
                        const cls = classes.find(c => c.id === box.classId);
                        return (
                          <div key={box.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{backgroundColor: cls?.color}}></span>
                              <span className="text-sm">{cls?.name || "Unknown"}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteAnnotation(box.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-mode" className="flex items-center gap-2">
                      {mode === 'edit' ? <Edit className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                      Edit Mode
                    </Label>
                    <Switch 
                      id="edit-mode"
                      checked={mode === 'edit'}
                      onCheckedChange={handleModeChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model-url">Model API URL</Label>
                    <Input 
                      id="model-url" 
                      placeholder="https://detect.roboflow.com/your-model/1" 
                      value={modelUrl}
                      onChange={e => setModelUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input 
                      id="api-key" 
                      placeholder="Your Roboflow API Key" 
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      type="password"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <Button className="w-full" onClick={handleDownload} disabled={Object.keys(annotations).length === 0}>
              <Download className="mr-2"/> Download Annotations
            </Button>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}