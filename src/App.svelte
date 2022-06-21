<script lang="ts">
	import path from 'path';

    const name: string = 'Svelte';
    const link = 'https://svelte.dev/tutorial';
	const { a, b } = { a: 1, b: 2 };
	console.log(a, b);
	console.log(path.resolve(path.resolve()));
</script>

<main>
    <h1>Hello {name}!</h1>
	<p>Visit the <a href={link}>Svelte tutorial</a> to learn how to build Svelte apps.</p>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
