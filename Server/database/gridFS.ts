// Server/database/gridfs.ts
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let gfsBucket: GridFSBucket;

export const initGridFS = () => {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }
    gfsBucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: 'uploads',
    });
};

export const getGridFSBucket = () => gfsBucket;
