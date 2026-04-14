<script>
	import { goto } from '$app/navigation';

	let { data } = $props();
	const years = $derived(data.years ?? []);
	const selectedYear = $derived(data.selectedYear);

	const groupAwards = (awards) => {
		const groups = new Map();

		for (const award of awards) {
			const weekNumber = typeof award.week === 'number' ? award.week + 1 : null;
			const key = weekNumber ?? 'unknown';

			if (!groups.has(key)) {
				groups.set(key, { weekNumber, awards: [] });
			}

			groups.get(key).awards.push(award);
		}

		return Array.from(groups.values()).sort((a, b) => {
			const aWeek = a.weekNumber ?? -1;
			const bWeek = b.weekNumber ?? -1;
			return bWeek - aWeek;
		});
	};

	const handleYearChange = (event) => {
		const year = Number(event.currentTarget.value);
		if (!Number.isFinite(year)) return;
		goto(`/?year=${year}`);
	};
</script>

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
			{#if group.weekNumber !== null}
				<h2>Week {group.weekNumber}</h2>
			{:else}
				<h2>Week Unknown</h2>
			{/if}
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
