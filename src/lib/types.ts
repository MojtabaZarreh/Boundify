export type BoundingBox = {
  id: string;
  classId: number;
  // All coordinates are in pixels relative to the original image
  x: number; // top-left x
  y: number; // top-left y
  width: number;
  height: number;
};

export type Class = {
  id: number;
  name: string;
  color: string;
};

export type ImageObject = {
  file: File;
  objectURL: string;
  width: number;
  height: number;
};
