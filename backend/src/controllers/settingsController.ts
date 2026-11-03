import { Request, Response } from 'express';
import { getInstitutionSettings, updateInstitutionSettings } from '../services/dataStore';

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getInstitutionSettings();
    res.json({
      success: true,
      data: settings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load institution settings',
    });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      academyName,
      academyLogo,
      address,
      phone,
      email,
      website,
      receiptPrefix,
      receiptFooterMessage,
      currencySymbol,
      selectedBranch,
      branches,
    } = req.body;

    if (!academyName || !String(academyName).trim()) {
      res.status(400).json({
        success: false,
        message: 'Academy / Institution Name is required.',
      });
      return;
    }
    if (!address || !String(address).trim()) {
      res.status(400).json({
        success: false,
        message: 'Institution address is required.',
      });
      return;
    }
    if (!receiptPrefix || !String(receiptPrefix).trim()) {
      res.status(400).json({
        success: false,
        message: 'Receipt prefix is required (e.g., REC).',
      });
      return;
    }

    const updated = await updateInstitutionSettings({
      academyName,
      academyLogo,
      address,
      phone,
      email,
      website,
      receiptPrefix,
      receiptFooterMessage,
      currencySymbol,
      selectedBranch,
      branches,
    });

    res.json({
      success: true,
      message: 'Institution settings saved successfully. All future and downloaded receipts will reflect these details.',
      data: updated,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to update settings',
    });
  }
};

