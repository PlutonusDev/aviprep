"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react"

interface ImageCropperProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  onCropComplete: (croppedBlob: Blob) => void
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropper({ open, onClose, imageSrc, onCropComplete }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [zoom, setZoom] = useState(1)
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    // Force 1:1 aspect ratio for square crop
    setCrop(centerAspectCrop(width, height, 1))
  }, [])

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current
    if (!image || !crop) return null

    const canvas = document.createElement("canvas")
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Output size - 256x256 square
    const outputSize = 256
    canvas.width = outputSize
    canvas.height = outputSize

    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Calculate the actual crop dimensions in the original image
    const cropX = (crop.x / 100) * image.naturalWidth
    const cropY = (crop.y / 100) * image.naturalHeight
    const cropWidth = (crop.width / 100) * image.naturalWidth
    const cropHeight = (crop.height / 100) * image.naturalHeight

    // Draw the cropped area onto the canvas
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, outputSize, outputSize)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
    })
  }, [crop])

  const handleSave = async () => {
    const croppedBlob = await getCroppedImg()
    if (croppedBlob) {
      onCropComplete(croppedBlob)
    }
  }

  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, 1))
    }
    setZoom(1)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Avatar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop area */}
          <div className="relative flex items-center justify-center bg-black/20 rounded-lg overflow-hidden min-h-[300px]">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={1}
              circularCrop
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={imageSrc || "/placeholder.svg"}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{
                  transform: `scale(${zoom})`,
                  maxHeight: "400px",
                  maxWidth: "100%",
                }}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Button type="button" variant="ghost" size="icon" onClick={handleReset} className="cursor-pointer ml-2">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition. Your avatar will be cropped to a square.
          </p>
        </div>

        <DialogFooter>
          <Button className="cursor-pointer bg-transparent" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={handleSave}>Save Avatar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
