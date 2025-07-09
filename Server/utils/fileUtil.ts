export const getFileType = (mime: string): 'pdf' | 'word' | 'excel' | 'image' | 'other' => {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('word')) return 'word';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'excel';
    if (mime.startsWith('image/')) return 'image';
    return 'other';
};
