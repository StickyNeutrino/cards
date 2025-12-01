#!/bin/bash

# Set the directory containing the PDF files
DIRECTORY="."  # Change this to your directory if needed

# Check if pdftoppm is installed
if ! command -v pdftoppm &> /dev/null
then
    echo "pdftoppm could not be found.  Please install poppler-utils."
    exit 1
fi

# Loop through all PDF files in the specified directory
for file in "$DIRECTORY"/*.pdf; do
  # Get the filename without the extension
  filename=$(basename "$file" .pdf)

  # Run pdftoppm to convert the PDF to PNG images
  pdftoppm -png -r 300 "$file" "$filename"

  # Check if the images exist before renaming
  if [ -f "$filename-1.png" ] && [ -f "$filename-2.png" ]; then
    # Rename the first page to "Front"
    mv "$filename-1.png" "${filename} Front.png"

    # Rename the second page to "Back"
    mv "$filename-2.png" "${filename} Back.png"
  elif [ -f "$filename-1.png" ]; then
    echo "Warning: Only one page found for $filename. Renaming to Front."
    mv "$filename-1.png" "${filename} Front.png"
  else
    echo "Error: No pages were generated for $filename."
  fi
done

echo "Finished processing all PDF files."

