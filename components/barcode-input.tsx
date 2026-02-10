"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Camera, Keyboard, X, Image as ImageIcon, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { BrowserMultiFormatReader } from "@zxing/library"

interface BarcodeInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  simpleMode?: boolean // If true, show only scanner input without tabs
}

export function BarcodeInput({ value, onChange, placeholder = "Enter barcode", disabled, simpleMode = false }: BarcodeInputProps) {
  const [activeTab, setActiveTab] = useState("manual")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  // Auto-focus input when tab changes
  useEffect(() => {
    if (activeTab === "manual" && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeTab])

  // Handle file upload (text or image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    // Check if it's an image file
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
    const isText = file.type === "text/plain" || file.name.endsWith(".txt")

    if (!isImage && !isText) {
      toast.error("Please upload an image file (.jpg, .png, etc.) or text file (.txt)")
      setIsProcessing(false)
      return
    }

    if (isText) {
      // Handle text file
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0)
        
        if (lines.length > 0) {
          onChange(lines[0])
          toast.success("Barcode loaded from file")
        } else {
          toast.error("File is empty or contains no valid barcode")
        }
        setIsProcessing(false)
      }
      reader.onerror = () => {
        toast.error("Failed to read file")
        setIsProcessing(false)
      }
      reader.readAsText(file)
    } else if (isImage) {
      // Handle image file - extract barcode
      try {
        // Create image preview
        const reader = new FileReader()
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string
          setImagePreview(imageUrl)
        }
        reader.readAsDataURL(file)

        // Extract barcode from image
        const codeReader = new BrowserMultiFormatReader()
        codeReaderRef.current = codeReader

        const image = new Image()
        image.onload = async () => {
          try {
            const result = await codeReader.decodeFromImage(image)

            if (result && result.getText()) {
              onChange(result.getText())
              toast.success("Barcode extracted from image!")
            } else {
              toast.error("No barcode found in image. Please try another image.")
            }
          } catch (error) {
            console.error("Barcode extraction error:", error)
            toast.error("Could not extract barcode from image. Please ensure the image contains a clear barcode.")
          } finally {
            setIsProcessing(false)
            URL.revokeObjectURL(image.src)
          }
        }

        image.onerror = () => {
          toast.error("Failed to load image")
          setIsProcessing(false)
          URL.revokeObjectURL(image.src)
        }

        image.crossOrigin = "anonymous"
        image.src = URL.createObjectURL(file)
      } catch (error) {
        console.error("Error processing image:", error)
        toast.error("Failed to process image")
        setIsProcessing(false)
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle camera scanning
  const startCameraScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Failed to access camera. Please check permissions.")
    }
  }

  const stopCameraScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  // Handle hardware scanner (keyboard input) - works on all tabs
  useEffect(() => {
    if (inputRef.current) {
      // Listen for rapid input (typical of barcode scanners)
      // Barcode scanners send characters very quickly followed by Enter
      let inputBuffer = ""
      let lastKeyTime = 0
      let timeout: NodeJS.Timeout

      const handleKeyPress = (e: KeyboardEvent) => {
        const currentTime = Date.now()
        
        if (e.key === "Enter") {
          if (inputBuffer.trim()) {
            onChange(inputBuffer.trim())
            inputBuffer = ""
            toast.success("Barcode scanned")
          }
          e.preventDefault()
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Only capture printable characters, not shortcuts
          const timeSinceLastKey = currentTime - lastKeyTime
          
          // If more than 50ms passed, reset buffer (user typing manually)
          // If less than 50ms, likely a scanner (very fast input)
          if (timeSinceLastKey > 50) {
            inputBuffer = e.key
          } else {
            inputBuffer += e.key
          }
          
          lastKeyTime = currentTime
          
          clearTimeout(timeout)
          timeout = setTimeout(() => {
            inputBuffer = ""
          }, 100) // Reset if no input for 100ms
        }
      }

      // Focus input when scanner tab is active or in simple mode
      if (activeTab === "scanner" || simpleMode) {
        inputRef.current.focus()
      }

      window.addEventListener("keypress", handleKeyPress)
      return () => {
        window.removeEventListener("keypress", handleKeyPress)
        clearTimeout(timeout)
      }
    }
  }, [activeTab, onChange, simpleMode])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraScan()
    }
  }, [])

  // Simple mode: just show scanner input without tabs
  if (simpleMode) {
    return (
      <div className="space-y-2">
        <Label htmlFor="barcode" className="text-sm font-medium">Barcode</Label>
        <Input
          ref={inputRef}
          id="barcode"
          name="barcode"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus
          className="w-full"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Keyboard className="w-3 h-3" />
          Scan barcode with hardware scanner or leave empty to auto-generate
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="barcode" className="text-sm font-medium">Barcode</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full h-auto p-1 gap-1.5 flex-wrap">
          <TabsTrigger 
            value="manual" 
            className="text-sm py-2.5 px-4 flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap justify-center"
          >
            <Keyboard className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Manual</span>
          </TabsTrigger>
          <TabsTrigger 
            value="file" 
            className="text-sm py-2.5 px-4 flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap justify-center"
          >
            <Upload className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>File</span>
          </TabsTrigger>
          <TabsTrigger 
            value="camera" 
            className="text-sm py-2.5 px-4 flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap justify-center"
          >
            <Camera className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Camera</span>
          </TabsTrigger>
          <TabsTrigger 
            value="scanner" 
            className="text-sm py-2.5 px-4 flex-1 min-w-[100px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap justify-center"
          >
            <Keyboard className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Scanner</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-2 mt-3">
          <Input
            ref={inputRef}
            id="barcode"
            name="barcode"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            Type barcode manually
          </p>
        </TabsContent>

        <TabsContent value="file" className="space-y-3">
          <div className="flex flex-col gap-3">
            <Input
              type="file"
              ref={fileInputRef}
              accept=".txt,text/plain,image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              onChange={handleFileUpload}
              disabled={disabled || isProcessing}
              className="hidden"
              id="barcode-file"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
            
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full rounded-lg border border-border overflow-hidden bg-muted/50">
                <img
                  src={imagePreview}
                  alt="Barcode preview"
                  className="w-full h-auto max-h-48 object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setImagePreview(null)
                    onChange("")
                  }}
                  className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Barcode Value Display */}
            {value && !imagePreview && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-mono flex-1 truncate">{value}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange("")}
                  className="h-7 w-7 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {value && imagePreview && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-mono flex-1 truncate">{value}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onChange("")
                    setImagePreview(null)
                  }}
                  className="h-7 w-7 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Upload an image file (.jpg, .png, etc.) to extract barcode automatically
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Or upload a .txt file containing the barcode (first line will be used)
            </p>
          </div>
        </TabsContent>

        <TabsContent value="camera" className="space-y-3 mt-3">
          {!isScanning ? (
            <Button
              type="button"
              variant="outline"
              onClick={startCameraScan}
              disabled={disabled}
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Camera Scan
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-sm">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none shadow-lg" />
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={stopCameraScan}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Camera
              </Button>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Camera className="w-3 h-3" />
                Position barcode in the frame. Manual entry still works below.
              </p>
            </div>
          )}
          <Input
            id="barcode-camera"
            name="barcode"
            type="text"
            placeholder="Or enter barcode manually"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="scanner" className="space-y-2 mt-3">
          <Input
            ref={inputRef}
            id="barcode-scanner"
            name="barcode"
            type="text"
            placeholder="Scan barcode with hardware scanner..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            autoFocus
            className="w-full"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Keyboard className="w-3 h-3" />
            Point your barcode scanner at the input field and scan. The scanner will automatically detect the barcode.
          </p>
        </TabsContent>
      </Tabs>

    </div>
  )
}
