<script>
  export let onClose = () => {};
</script>

<div class="modal-backdrop" on:click="{onClose}">
  <div class="modal-content" on:click|stopPropagation>
    <slot />
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-content {
    background: white;
    padding: 1rem;
    border-radius: 8px;
  }
</style>
