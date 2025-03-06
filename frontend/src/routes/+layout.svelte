<script lang="ts">
	import "../app.css";
	let { children } = $props();
	import {
		toasts,
		ToastContainer,
		FlatToast,
		BootstrapToast,
	} from "svelte-toasts";
</script>

{@render children()}
<ToastContainer placement="bottom-right" let:data>
	<FlatToast {data} />
	<!-- Provider template for your toasts -->
</ToastContainer>
