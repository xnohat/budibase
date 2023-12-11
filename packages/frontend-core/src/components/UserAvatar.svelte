<script>
  import { Avatar, Tooltip, Helpers } from "@budibase/bbui"

  export let user
  export let size
  export let tooltipDirection = "top"
  export let showTooltip = true

  $: tooltipStyle = getTooltipStyle(tooltipDirection)

  const getTooltipStyle = direction => {
    if (!direction) {
      return ""
    }
    if (direction === "top") {
      return "transform: translateX(-50%) translateY(-100%);"
    } else if (direction === "bottom") {
      return "transform: translateX(-50%) translateY(100%);"
    }
  }
</script>

{#if user}
  <div class="user-avatar">
    <Avatar
      {size}
      initials={Helpers.getUserInitials(user)}
      color={Helpers.getUserColor(user)}
    />
    {#if showTooltip}
      <div class="tooltip" style={tooltipStyle}>
        <Tooltip
          direction={tooltipDirection}
          textWrapping
          text={user.email}
          size="S"
        />
      </div>
    {/if}
  </div>
{/if}

<style>
  .user-avatar {
    position: relative;
  }
  .tooltip {
    display: none;
    position: absolute;
    top: 0;
    left: 50%;
    white-space: nowrap;
  }
  .user-avatar:hover .tooltip {
    display: block;
  }
</style>
