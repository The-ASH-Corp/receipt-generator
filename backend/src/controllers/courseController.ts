import { Request, Response } from 'express';
import {
  listCourses,
  createCourseRecord,
  updateCourseRecord,
  deleteCourseRecord,
} from '../services/dataStore';

export const getCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const courses = await listCourses();
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load courses',
    });
  }
};

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Course name is required.' });
      return;
    }
    const course = await createCourseRecord(String(name));
    res.status(201).json({
      success: true,
      message: `Course "${course.name}" added successfully.`,
      data: course,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to create course',
    });
  }
};

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ success: false, message: 'Course name is required.' });
      return;
    }
    const course = await updateCourseRecord(req.params.id, String(name));
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found.' });
      return;
    }
    res.json({
      success: true,
      message: 'Course updated successfully.',
      data: course,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to update course',
    });
  }
};

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await deleteCourseRecord(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Course not found.' });
      return;
    }
    res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to delete course',
    });
  }
};

