import { useNavigate } from 'react-router-dom';

export default function InstructionPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1>任务说明</h1>
      <p>在本任务中，你将与 AI 一起合作完成一篇故事写作。整个任务共 3 轮，每一轮都包含以下步骤：</p>

      <h2>步骤 1：阅读 AI 写的段落</h2>
      <p>系统会先提供一段由 AI 生成的英文故事内容。请认真阅读该段落。</p>

      <h2>步骤 2：查看生词含义</h2>
      <p>
        在段落中，一些单词会被标记为蓝色。当你把鼠标移动到这些单词上方时，会弹出一个小窗口，显示该词的含义说明。
      </p>

      <h2>步骤 3：继续写故事</h2>
      <p>
        在阅读完 AI 的段落后，你需要根据给出的开头句继续写故事。请在该句后面继续写50-60词，使故事自然地发展下去。
      </p>

      <div className="important-note">
        <strong>重要提示：</strong>
        <ul className="instruction-list">
          <li>请尽量保持故事内容连贯。</li>
          <li>可以使用你刚刚看到的新单词，但不是必须的。</li>
          <li>每一轮写完后，请点击完成，系统会进入下一轮，AI 会继续生成新的故事段落。</li>
          <li>整个任务共 3 轮阅读 + 写作，最终完成一篇完整的故事。</li>
        </ul>
      </div>

      <p style={{ textAlign: 'center', color: '#718096', marginTop: 24 }}>
        如果您有任何问题，请举手提问。如果您理解了这个任务，请点击【开始】
      </p>

      <div className="btn-center">
        <button className="btn" onClick={() => navigate('/reading/1')}>
          开始 (Start)
        </button>
      </div>
    </div>
  );
}
