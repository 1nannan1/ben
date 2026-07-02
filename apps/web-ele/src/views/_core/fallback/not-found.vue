<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';
import { preferences } from '@vben/preferences';

defineOptions({ name: 'Fallback404Demo' });
</script>

<template>
  <Fallback :home-path="preferences.app.defaultHomePath" status="404" />
</template>
