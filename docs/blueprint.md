# **App Name**: Boundify Annotator

## Core Features:

- Image Loading and Display: Load and display images from the user's local device onto a canvas with zoom and pan capabilities.
- Class Management: Allow users to dynamically define and select classes (labels) for bounding boxes.
- Bounding Box Creation and Editing: Enable users to create, select, move, resize, rename (change class), and delete bounding boxes using intuitive drag-and-drop and resizing handles.
- Annotation Saving (YOLO Format): Save annotations for each image as a separate .txt file in YOLO format (class_id x_center y_center width height normalized to [0,1]).
- Annotation Download: Provide a download button that bundles all annotation files into a single ZIP archive for easy access and management.
- Model API Integration (Future): Allow specifying a model API URL for future integration with machine learning models for automated labeling assistance (no actual model call for now).

## Style Guidelines:

- Primary color: Light blue (#90CAF9), inspired by Apple's blue accent, for a calm and professional feel.
- Background color: Very light gray (#F5F5F5), almost white, desaturated (20%), for a clean and modern glassmorphism effect.
- Accent color: Soft blue (#64B5F6), slightly more saturated and brighter than the primary, for interactive elements.
- Body and headline font: 'Inter' sans-serif for a clean and modern look.
- Use a responsive split-screen layout with a large image display on the left and a control panel on the right. Implement smooth animations and transitions for buttons and interactions.
- Add smooth transitions when the user clicks buttons.
- Employ simple, line-based icons to provide clear and understandable visual cues for all actions, aligning with the application's modern aesthetic.