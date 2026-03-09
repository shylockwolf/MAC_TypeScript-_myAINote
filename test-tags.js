import { analyzeNote } from './src/services/deepseek';

const testContent = '我用OpenClaw做了一台番茄钟小程序，整个过程只花了5分钟，从无到有确实很快。但后续我花了好几个小时打磨它——加状态栏、做移动端适配、调键盘快捷键、配音效。说实话，效果完全超过我的预期，尤其是动画部分，那些效果我自己是完全做不出来的。 但使用过程中我也发现了一些局限：对话一多，模型就容易出问题。我平时也使用豆包、Kimi K2.5等多种AI产品，能明确区分出优劣：编程这块还是Kimi 2.5更好，错误稍微少一点。';

async function testTagGeneration() {
  try {
    const analysis = await analyzeNote(testContent);
    console.log('Analysis result:', analysis);
    
    const allTags = [
      { key: 'category', value: analysis.category },
      { key: 'date', value: new Date().toLocaleDateString() },
      { key: 'topic', value: analysis.topic },
      ...analysis.people.map(p => ({ key: 'people', value: p })),
      ...analysis.subjects.map(s => ({ key: 'subject', value: s })),
      ...analysis.objects.map(o => ({ key: 'object', value: o }))
    ];

    const ignoreWords = new Set(['我', '你', '他', '她', '它', '我们', '你们', '他们', '这个', '那个', '这些', '那些', '什么', '怎么', '为什么', '因为', '所以', '但是', '而且', '然后', '还是', '已经', '开始', '一直', '总是', '完全', '非常', '特别', '比较', '应该', '可能', '需要', '可以', '能够', '想要', '觉得', '感觉', '发现', '问题', '情况', '时候', '现在', '目前', '之前', '之后', '以上', '以下', '关于', '对于', '根据', '通过', '由于', '除了', '包括', '以及', '或者', '和', '与', '的', '了', '着', '过', '到', '在', '从', '把', '被', '让', '给', '为', '对', '向', '往', '往', '去', '来', '上', '下', '里', '外', '内', '前', '后', '左', '右', '中', '间', '旁', '边', '侧', '顶', '底', '头', '尾', '首', '末', '初', '终', '始', '终', '刚', '才', '就', '都', '也', '又', '再', '还', '更', '最', '太', '很', '好', '坏', '多', '少', '大', '小', '长', '短', '新', '旧', '真', '假', '是', '否', '有', '无', '没', '不', '没']);

    const filteredTags = allTags.filter(tag => {
      const value = tag.value.trim();
      if (value.length < 2) return false;
      if (ignoreWords.has(value)) return false;
      if (value === analysis.topic) return false;
      return true;
    });

    const uniqueTags = Array.from(
      new Map(filteredTags.map(tag => [tag.key + ':' + tag.value, tag])).values()
    );

    const categoryTag = uniqueTags.find(t => t.key === 'category');
    const otherTags = uniqueTags.filter(t => t.key !== 'category');
    const reorderedTags = categoryTag ? [categoryTag, ...otherTags] : uniqueTags;

    const limitedTags = reorderedTags.slice(0, 8);

    console.log('All tags:', allTags);
    console.log('Filtered tags:', filteredTags);
    console.log('Unique tags:', uniqueTags);
    console.log('Reordered tags:', reorderedTags);
    console.log('Limited tags:', limitedTags);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTagGeneration();