import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

const MAX_VIEWPORT_SIZE = 280;
const VIEWPORT_SCREEN_MARGIN = 96;
// room for the title, zoom slider and buttons, since the dialog can't scroll
const VIEWPORT_SCREEN_HEIGHT_MARGIN = 280;
// the server stores profile photos at no more than 400x400
const OUTPUT_SIZE = 400;
const MAX_ZOOM = 3;
const ZOOM_KEY_STEP = 0.1;
const MOVE_KEY_STEP = 8;

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface PhotoCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
  onError: (message: string) => void;
}

/**
 * Keep the image covering the whole viewport at the given scale.
 * Offsets are the distance of the image's center from the viewport's center.
 */
const clampOffset = (offset: Point, image: Size, scale: number, viewportSize: number): Point => {
  const maxX = Math.max(0, (image.width * scale - viewportSize) / 2);
  const maxY = Math.max(0, (image.height * scale - viewportSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y))
  };
};

/**
 * Dialog to choose which square part of a photo to use.
 */
const PhotoCropper = ({ file, onCancel, onConfirm, onError }: PhotoCropperProps): React.ReactElement => {
  const [viewportSize] = useState(() =>
    Math.min(
      MAX_VIEWPORT_SIZE,
      window.innerWidth - VIEWPORT_SCREEN_MARGIN,
      window.innerHeight - VIEWPORT_SCREEN_HEIGHT_MARGIN
    )
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ pointerId: 0, pointer: { x: 0, y: 0 }, offset: { x: 0, y: 0 } });
  const isMountedRef = useRef(true);

  // the smallest scale at which the image still covers the viewport
  const baseScale = imageSize ? viewportSize / Math.min(imageSize.width, imageSize.height) : 1;
  const scale = baseScale * zoom;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (!isDragging || !imageSize) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { pointerId, pointer, offset: startOffset } = dragStartRef.current;
      if (e.pointerId !== pointerId) return;
      setOffset(
        clampOffset(
          { x: startOffset.x + e.clientX - pointer.x, y: startOffset.y + e.clientY - pointer.y },
          imageSize,
          scale,
          viewportSize
        )
      );
    };
    const stopDragging = (e: PointerEvent) => {
      if (e.pointerId === dragStartRef.current.pointerId) setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [isDragging, imageSize, scale, viewportSize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
    viewportRef.current?.focus();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // a right click opens a menu that can swallow the release, and a second finger isn't a new drag
    if (e.button !== 0 || isDragging) return;
    e.preventDefault();
    viewportRef.current?.focus();
    dragStartRef.current = { pointerId: e.pointerId, pointer: { x: e.clientX, y: e.clientY }, offset };
    setIsDragging(true);
  };

  const changeZoom = (requestedZoom: number) => {
    if (!imageSize) return;
    const newZoom = Math.min(MAX_ZOOM, Math.max(1, requestedZoom));
    // keep the same part of the photo in the center while zooming
    const ratio = newZoom / zoom;
    setOffset(clampOffset({ x: offset.x * ratio, y: offset.y * ratio }, imageSize, baseScale * newZoom, viewportSize));
    setZoom(newZoom);
  };

  const moveBy = (dx: number, dy: number) => {
    if (!imageSize) return;
    setOffset(clampOffset({ x: offset.x + dx, y: offset.y + dy }, imageSize, scale, viewportSize));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // leave browser shortcuts like cmd-plus and alt-left alone
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const actions: { [key: string]: () => void } = {
      ArrowLeft: () => moveBy(-MOVE_KEY_STEP, 0),
      ArrowRight: () => moveBy(MOVE_KEY_STEP, 0),
      ArrowUp: () => moveBy(0, -MOVE_KEY_STEP),
      ArrowDown: () => moveBy(0, MOVE_KEY_STEP),
      "+": () => changeZoom(zoom + ZOOM_KEY_STEP),
      "=": () => changeZoom(zoom + ZOOM_KEY_STEP),
      "-": () => changeZoom(zoom - ZOOM_KEY_STEP)
    };
    if (Object.prototype.hasOwnProperty.call(actions, e.key)) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!imageRef.current || !imageSize || !context) {
      onError("The photo could not be processed.");
      return;
    }

    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!isPng) {
      // JPEGs have no transparency, which would otherwise come out black
      context.fillStyle = "white";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }

    const cropSize = viewportSize / scale;
    const cropX = (imageSize.width - cropSize) / 2 - offset.x / scale;
    const cropY = (imageSize.height - cropSize) / 2 - offset.y / scale;
    context.imageSmoothingQuality = "high";
    context.drawImage(imageRef.current, cropX, cropY, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const type = isPng ? "image/png" : "image/jpeg";
    canvas.toBlob(
      blob => {
        // cancelled, or already confirmed, while the image was encoding
        if (!isMountedRef.current) return;
        if (blob) {
          onConfirm(new File([blob], `profile.${isPng ? "png" : "jpg"}`, { type }));
        } else {
          onError("The photo could not be processed.");
        }
      },
      type,
      0.92
    );
  };

  return (
    <Modal closeModal={onCancel}>
      <div className="my-profile-crop">
        <h3 className="my-profile-dialog-title">Adjust your photo</h3>
        <div
          ref={viewportRef}
          className={`my-profile-crop-viewport${isDragging ? " dragging" : ""}`}
          style={{ width: viewportSize, height: viewportSize }}
          role="group"
          aria-label="Photo position. Drag or use the arrow keys to move it, and plus or minus to zoom."
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        >
          {imageUrl && (
            <img
              ref={imageRef}
              className="my-profile-crop-image"
              src={imageUrl}
              alt=""
              draggable={false}
              style={
                imageSize
                  ? {
                      width: imageSize.width * scale,
                      height: imageSize.height * scale,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
                    }
                  : { visibility: "hidden" }
              }
              onLoad={handleImageLoad}
              onError={() => onError("Photo must be a JPG or PNG.")}
            />
          )}
          <div className="my-profile-crop-mask" />
        </div>
        <span className="my-profile-hint">Drag to reposition</span>
        <label className="my-profile-crop-zoom">
          <span className="my-profile-hint">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!imageSize}
            onChange={e => changeZoom(Number(e.target.value))}
          />
        </label>
        <div className="my-profile-dialog-actions">
          <button type="button" className="my-profile-outline-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-btn" disabled={!imageSize} onClick={handleConfirm}>
            Use photo
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PhotoCropper;
