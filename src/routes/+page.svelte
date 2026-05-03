<script>
	import { goto } from '$app/navigation';

	let { data } = $props();
	const years = $derived(data.years ?? []);
	const selectedYear = $derived(data.selectedYear);

	const groupAwards = (awards) => {
		const groups = new Map();

		for (const award of awards) {
			const weekNumber = typeof award.week === 'number' ? award.week + 1 : null;
			const isChampionship =
				typeof award.event_type_string === 'string' &&
				award.event_type_string.toLowerCase().includes('championship');
			const label = weekNumber
				? `Week ${weekNumber}`
				: isChampionship
					? 'Championship'
					: 'Week Unknown';
			const key = label;

			if (!groups.has(key)) {
				groups.set(key, { weekNumber, label, awards: [] });
			}

			groups.get(key).awards.push(award);
		}

		return Array.from(groups.values()).sort((a, b) => {
			if (a.label === 'Championship' && b.label !== 'Championship') return -1;
			if (b.label === 'Championship' && a.label !== 'Championship') return 1;
			const aWeek = a.weekNumber ?? -1;
			const bWeek = b.weekNumber ?? -1;
			if (aWeek !== bWeek) return bWeek - aWeek;
			if (a.label === 'Week Unknown' && b.label !== 'Week Unknown') return 1;
			if (b.label === 'Week Unknown' && a.label !== 'Week Unknown') return -1;
			return a.label.localeCompare(b.label);
		});
	};

	const handleYearChange = (event) => {
		const year = Number(event.currentTarget.value);
		if (!Number.isFinite(year)) return;
		goto(`/?year=${year}`);
	};
</script>

<svelte:head>
	<title>BAG Awards</title>
</svelte:head>

<h1>BAG Awards</h1>

{#if years.length > 0}
	<label>
		Year
		<select on:change={handleYearChange} value={selectedYear}>
			{#each years as year}
				<option value={year}>{year}</option>
			{/each}
		</select>
	</label>
{/if}

{#await data.awards}
	<p class="loading">Spamming TBA API...</p>
{:then awardsData}
	{#if awardsData.length === 0}
		<p>No awards found.</p>
	{:else}
		{@const groupedAwards = groupAwards(awardsData)}
		{#each groupedAwards as group}
			<h2>{group.label}</h2>
			<table>
				<thead>
					<tr>
						<th>Team</th>
						<th>Award</th>
						<th>Event</th>
					</tr>
				</thead>
				<tbody>
					{#each group.awards as award}
						<tr>
							<td>{award.team_number ?? award.team_key}</td>
							<td>{award.name}</td>
							<td>
								{#if award.event_name}
									{award.event_name}
								{:else}
									{award.event_key}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/each}
	{/if}
{:catch}
	<p class="error">Failed to load awards.</p>
{/await}

<style>
	table {
		border-collapse: collapse;
		width: 100%;
		margin-top: 10px;
		table-layout: fixed;
	}

	th,
	td {
		border: 1px solid #ccc;
		padding: 0.5rem 0.75rem;
		text-align: left;
		vertical-align: top;
		overflow-wrap: anywhere;
	}

	thead th {
		background: #f5f5f5;
	}

	th:nth-child(1),
	td:nth-child(1) {
		width: 15%;
	}

	th:nth-child(2),
	td:nth-child(2) {
		width: 45%;
	}

	th:nth-child(3),
	td:nth-child(3) {
		width: 40%;
	}

	.loading {
		margin: 0.5rem 0 1rem;
		font-weight: 600;
	}

	.error {
		margin: 0.5rem 0 1rem;
		font-weight: 600;
		color: #b00020;
	}

	h2 {
		margin: 1.25rem 0 0.5rem;
	}
</style>
