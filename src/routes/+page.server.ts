import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const TEAM_NUMBERS = [
	8, 100, 114, 115, 192, 199, 253, 254, 581, 604, 649, 668, 670, 751, 766, 840, 841, 846, 852, 971,
	972, 1072, 1280, 1351, 1458, 1671, 1700, 1868, 1967, 2035, 2135, 2204, 2367, 2473, 2643, 2813,
	3045, 3256, 3482, 3501, 4135, 4159, 4186, 4255, 4669, 4904, 4973, 4990, 5026, 5027, 5104, 5171,
	5419, 5430, 5499, 5507, 5940, 6036, 6059, 6238, 6418, 6619, 6814, 6822, 6962, 7413, 7419, 7667,
	8016, 8033, 8045, 8404, 8840, 8852, 9038, 9144, 9125, 9143, 9400, 9470, 10221, 10252, 10372
];
const TEAM_KEYS = TEAM_NUMBERS.map((teamNumber) => `frc${teamNumber}`);
const eventCache = new Map();

export const load: PageServerLoad = async ({ url }) => {
	const apiKey = env.TBA_AUTH_KEY;

	if (!apiKey) {
		throw error(500, 'Missing TBA api key');
	}

	const tbaModule = await import('tba-api-v3client');
	const userAgent = env.TBA_USER_AGENT ?? 'bagAwards/1.0';
	const tbaClient = tbaModule.default ?? tbaModule;
	const { ApiClient, TeamApi, EventApi } = tbaClient;

	ApiClient.instance.authentications.apiKey.apiKey = apiKey;
	ApiClient.instance.defaultHeaders['User-Agent'] = userAgent;

	const teamApi = new TeamApi(ApiClient.instance);
	const eventApi = new EventApi(ApiClient.instance);

	const getEventInfo = async (eventKey) => {
		if (eventCache.has(eventKey)) {
			return eventCache.get(eventKey);
		}

		const event = await new Promise((resolve, reject) => {
			eventApi.getEvent(eventKey, {}, (err, data) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(data ?? null);
			});
		}).catch((err) => {
			throw error(500, `Failed to load event ${eventKey}: ${String(err)}`);
		});

		const info = {
			key: eventKey,
			name: event?.name ?? eventKey,
			week: typeof event?.week === 'number' ? event.week : null
		};

		eventCache.set(eventKey, info);

		return info;
	};

	const getTeamYears = async (teamKey) => {
		const data = await new Promise((resolve, reject) => {
			teamApi.getTeamYearsParticipated(teamKey, {}, (err, years) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(years ?? []);
			});
		}).catch((err) => {
			throw error(500, `Failed to load years for ${teamKey}: ${String(err)}`);
		});

		return data;
	};

	const getTeamAwardsForYear = async (teamKey, year) => {
		const data = await new Promise((resolve, reject) => {
			teamApi.getTeamAwardsByYear(teamKey, year, {}, (err, awards) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(awards ?? []);
			});
		}).catch((err) => {
			throw error(500, `Failed to load awards for ${teamKey}: ${String(err)}`);
		});

		return data.map((award) => ({ award, team_key: teamKey }));
	};

	const yearsByTeam = await Promise.all(TEAM_KEYS.map((teamKey) => getTeamYears(teamKey)));
	const sortedYears = [...new Set(yearsByTeam.flat())].sort((a, b) => b - a);
	const requestedYear = Number(url.searchParams.get('year'));
	const selectedYear =
		Number.isFinite(requestedYear) && sortedYears.includes(requestedYear)
			? requestedYear
			: (sortedYears[0] ?? null);

	const loadAwardsForYear = async (year) => {
		const awardsByTeam = await Promise.all(
			TEAM_KEYS.map((teamKey) => getTeamAwardsForYear(teamKey, year))
		);
		const awardEntries = awardsByTeam.flat();

		console.log('TBA raw awards response:', awardEntries);

		const uniqueEventKeys = [
			...new Set(awardEntries.map(({ award }) => award.event_key).filter(Boolean))
		];
		await Promise.all(uniqueEventKeys.map((eventKey) => getEventInfo(eventKey)));

		const enrichedAwards = awardEntries
			.map(({ award, team_key }) => {
				const eventInfo = award.event_key ? eventCache.get(award.event_key) : null;
				const week = typeof eventInfo?.week === 'number' ? eventInfo.week : null;
				const teamNumber = team_key?.replace(/^frc/i, '') ?? '';

				return {
					name: award.name ?? '',
					event_key: award.event_key ?? '',
					year: award.year ?? null,
					award_type: award.award_type ?? null,
					recipient_list: award.recipient_list ?? [],
					week,
					event_name: eventInfo?.name ?? null,
					team_key,
					team_number: teamNumber
				};
			})
			.sort((a, b) => {
				const weekDiff = (b.week ?? -1) - (a.week ?? -1);
				if (weekDiff !== 0) return weekDiff;
				return a.event_key.localeCompare(b.event_key);
			});

		return JSON.parse(JSON.stringify(enrichedAwards));
	};

	const awards = selectedYear ? loadAwardsForYear(selectedYear) : Promise.resolve([]);

	return {
		awards,
		years: sortedYears,
		selectedYear
	};
};
