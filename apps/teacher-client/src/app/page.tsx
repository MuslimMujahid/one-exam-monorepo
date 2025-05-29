import { Input, SharedComponent } from '@one-exam-monorepo/ui';

export default function Index() {
  return (
    <div>
      <SharedComponent />
      <div className='text-green-500'>This text should be green</div>
      <Input />
    </div>
  );
}
