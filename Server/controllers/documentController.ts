// Server/controllers/documentController.ts
import { Request, Response } from 'express';
import { Comparison } from '../database/models/comparisonModel';
import { getFileType } from '../utils/fileUtil';
import { getGridFSBucket } from '../database/gridFS';

export const uploadDocuments = async (req: Request, res: Response) => {
    const busboy = require('busboy');
    const bb = busboy({ headers: req.headers });

    const fileIds: any = {};
    const fileNames: any = {};
    const fileTypes: any = {};

    bb.on('file', (fieldname: string, file: any, info: any) => {
        const { filename, mimeType } = info;
        const bucket = getGridFSBucket();

    const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimeType,
    });

    file.pipe(uploadStream);

    uploadStream.on('finish', () => {
            fileIds[fieldname] = uploadStream.id;
            fileNames[fieldname] = filename;
            fileTypes[fieldname] = getFileType(mimeType);
        });
    });

    bb.on('finish', async () => {
            if (!fileIds['fileA'] || !fileIds['fileB']) {
            return res.status(400).json({ error: 'Both files are required.' });
        }

    const comparison = await Comparison.create({
        fileAName: fileNames['fileA'],
        fileBName: fileNames['fileB'],
        fileAType: fileTypes['fileA'],
        fileBType: fileTypes['fileB'],
        fileAId: fileIds['fileA'],
        fileBId: fileIds['fileB'],
        status: 'pending',
    });

    res.status(201).json({
        message: 'Files uploaded to GridFS and saved to DB',
        comparisonId: comparison._id,
    });
    });

    req.pipe(bb);
};
