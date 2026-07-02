<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';
import { preferences } from '@vben/preferences';

defineOptions({ name: 'Fallback403Demo' });
</script>

<template>
  <Fallback :home-path="preferences.app.defaultHomePath" status="403" />
</template>
