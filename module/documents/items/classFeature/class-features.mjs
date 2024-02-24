import { SYSTEM } from '../../../settings.js';
import { ArcanumDataModel } from './arcanist/arcanum-data-model.mjs';
import { AlchemyDataModel } from './tinkerer/alchemy-data-model.mjs';
import { MagitechDataModel } from './tinkerer/magitech-data-model.mjs';
import { InfusionsDataModel } from './tinkerer/infusion-data-model.mjs';

/**
 * @param {ClassFeatureRegistry} registry
 */
export const registerClassFeatures = (registry) => {
	registry.register(SYSTEM, 'arcanum', ArcanumDataModel);
	registry.register(SYSTEM, 'alchemy', AlchemyDataModel);
	registry.register(SYSTEM, 'magitech', MagitechDataModel);
	registry.register(SYSTEM, 'infusions', InfusionsDataModel);
};