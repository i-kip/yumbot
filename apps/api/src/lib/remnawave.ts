import { RemnawaveClient } from '@yumbot/remnawave';
import { config } from '../config.js';

export const remnawave = new RemnawaveClient(config.REMNAWAVE_URL, config.REMNAWAVE_TOKEN);
