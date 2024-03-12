import { FU } from './config.mjs';
import { SYSTEM } from '../settings.js';
import { Flags } from './flags.mjs';

export function registerChatInteraction() {
	Hooks.on('renderChatMessage', attachDamageApplicationHandler);
}

/**
 * @param {ChatMessage} message
 * @param {jQuery} jQuery
 */
function attachDamageApplicationHandler(message, jQuery) {
	/**
	 * @type CheckParameters
	 */
	const check = message.getFlag(SYSTEM, Flags.ChatMessage.CheckParams);
	if (check && check.damage) {
		let disabled = false;
		jQuery.find(`a[data-action=applyDamage]`).click(async function (event) {
			if (!disabled) {
				disabled = true;
				await handleDamageApplication(check, message, {
					alt: event.altKey,
					ctrl: event.ctrlKey || event.metaKey,
					shift: event.shiftKey,
				});
				disabled = false;
			}
		});
	}
}

/**
 * @typedef ClickModifiers
 * @param {boolean} alt
 * @param {boolean} ctrl
 * @param {boolean} shift
 */
/**
 * @typedef DamageModifier
 * @function
 * @param {number} baseDamage
 * @param {ClickModifiers} modifiers
 * @return {number}
 */

/**
 * @type {Record<number, DamageModifier>}
 */
const affinityDamageModifier = {
	[FU.affValue.vulnerability]: (damage) => damage * 2,
	[FU.affValue.none]: (damage) => damage,
	[FU.affValue.resistance]: (damage, { shift }) => (shift ? damage : Math.floor(damage / 2)),
	[FU.affValue.immunity]: (damage, { shift, ctrl }) => (shift && ctrl ? damage : 0),
	[FU.affValue.absorption]: (damage) => -damage,
};

const affinityKeys = {
	[FU.affValue.vulnerability]: () => 'FU.ChatApplyDamageVulnerable',
	[FU.affValue.none]: () => 'FU.ChatApplyDamageNormal',
	[FU.affValue.resistance]: ({ shift }) => (shift ? 'FU.ChatApplyDamageResistantIgnored' : 'FU.ChatApplyDamageResistant'),
	[FU.affValue.immunity]: ({ shift, ctrl }) => (shift && ctrl ? 'FU.ChatApplyDamageImmuneIgnored' : 'FU.ChatApplyDamageImmune'),
	[FU.affValue.absorption]: () => 'FU.ChatApplyDamageAbsorb',
};

/**
 * @param {CheckParameters} check
 * @param {ChatMessage} message
 * @param {ClickModifiers} modifiers
 * @return {Promise}
 */
async function handleDamageApplication(check, message, modifiers) {
	const actors = canvas.tokens.controlled.map((value) => value.document.actor).filter((value) => value);
	if (!actors.length) {
		if (game.user.character) {
			actors.push(game.user.character);
		} else {
			ui.notifications.error('FU.ChatApplyDamageNoActorsSelected', { localize: true });
			return;
		}
	}
	const { total = 0, type: damageType } = check.damage;
	const affinityType = damageType === 'physical' ? 'phys' : damageType;

	const updates = [];
	for (const actor of actors) {
		const affinity = actor.system.affinities[affinityType].current;
		const damageMod = affinityDamageModifier[affinity] ?? affinityDamageModifier[FU.affValue.none];
		const damageTaken = damageMod(-total, modifiers);
		updates.push(actor.modifyTokenAttribute('resources.hp', damageTaken, true));
		updates.push(
			ChatMessage.create({
				speaker: message.speaker,
				flavor: game.i18n.localize(FU.affType[affinity]),
				content: await renderTemplate('systems/projectfu/templates/chat/chat-apply-damage.hbs', {
					message: affinityKeys[affinity](modifiers),
					actor: actor.name,
					damage: Math.abs(damageTaken),
					type: game.i18n.localize(FU.damageTypes[damageType]),
					from: check.details.name,
				}),
			}),
		);
	}
	return Promise.all(updates);
}
