(function(root){
  'use strict';
  const raw = {
    vocabulary: {
      A1: [
        ["A person who teaches students is a ___.",["teacher","driver","farmer","customer"],0,"people","A teacher helps students learn."],
        ["If you feel thirsty, you want a ___.",["drink","blanket","ticket","pillow"],0,"daily life","Thirst means that you need something to drink."],
        ["What is the opposite of 'expensive'?",["cheap","heavy","empty","slow"],0,"opposites","Cheap means costing little money."],
        ["A neighbour is someone who ___.",["lives near you","works in another country","teaches you","sells you food"],0,"people","A neighbour lives close to your home."],
        ["Which word means 'not noisy'?",["quiet","busy","crowded","bright"],0,"adjectives","A quiet place has little noise."],
        ["The train is late. It will arrive ___.",["later than expected","before it leaves","at the usual time","without stopping"],0,"time","Late means after the expected time."],
        ["A weekend usually means ___.",["Saturday and Sunday","Monday and Tuesday","the first two days of a month","every evening"],0,"time","In many countries, the weekend is Saturday and Sunday."],
        ["You need a ticket to ___.",["travel by train","cook dinner","open a window","send a message"],0,"travel","A ticket gives permission to travel or enter a place."]
      ],
      A2: [
        ["If you look after a child, you ___.",["take care of the child","look for the child","teach the child to read","wait for the child"],0,"phrasal verbs","Look after means take care of."],
        ["If I lend you my pen, I ___.",["give it to you temporarily","buy it for you","borrow it from you","throw it away"],0,"common verbs","Lend means give something temporarily."],
        ["An appointment is ___.",["an arranged meeting at a particular time","a place where people exercise","a written exam","a journey without a plan"],0,"everyday vocabulary","An appointment is an agreed time to meet someone."],
        ["We have run out of milk. This means ___.",["there is no milk left","the milk is too cold","the milk has arrived","we have bought extra milk"],0,"phrasal verbs","Run out of means use all of something so none remains."],
        ["If your English improves, it ___.",["gets better","becomes more expensive","stays exactly the same","becomes less useful"],0,"word meaning","Improve means become better."],
        ["It will probably rain. The speaker thinks rain is ___.",["likely","impossible","unusual in every place","already finished"],0,"adverbs","Probably means that something is likely to happen."],
        ["Please speak quietly in the library. You should speak ___.",["with little noise","very quickly","in a foreign language","to everyone"],0,"adverbs","Quietly means in a way that makes little noise."],
        ["I chose tea instead of coffee. I chose tea ___.",["in place of coffee","after drinking coffee","because coffee was free","as well as coffee"],0,"linking expressions","Instead of means in place of."]
      ],
      B1: [
        ["She cannot afford a new laptop. This means she ___.",["does not have enough money for it","does not know how to use it","does not want any technology","has already repaired it"],0,"word meaning","Afford means have enough money or time for something."],
        ["He avoids driving at night. He tries to ___.",["not drive at night","drive faster at night","learn to drive at night","find roads at night"],0,"verb meaning","Avoid means keep away from something or prevent it."],
        ["We need a reliable source. It should be ___.",["dependable and trustworthy","very entertaining","expensive to access","difficult to understand"],0,"adjectives","Reliable means able to be trusted."],
        ["Eventually, they found the right address. They found it ___.",["in the end","immediately","by accident before leaving","every morning"],0,"adverbs","Eventually means in the end, after some time."],
        ["I couldn't figure out the answer. I couldn't ___.",["understand or solve it","write it in capital letters","remember who asked it","make it more difficult"],0,"phrasal verbs","Figure out means understand or solve."],
        ["She took part in the competition. She ___.",["participated in it","watched it from home","organised it alone","cancelled it"],0,"collocations","Take part in means participate."],
        ["Please consider all the options before deciding. You should ___.",["think carefully about them","reject them immediately","forget that they exist","choose the cheapest without thinking"],0,"verb meaning","Consider means think carefully about something."],
        ["The team is likely to win. It is ___ that they will win.",["probable","certainly impossible","unrelated","regrettable"],0,"adjectives","Likely means probable, but not guaranteed."]
      ],
      B2: [
        ["She was reluctant to speak. She was ___.",["unwilling or hesitant","eager and excited","unable to understand","forced to speak loudly"],0,"nuanced adjectives","Reluctant means unwilling or hesitant."],
        ["There is a subtle difference between the designs. The difference is ___.",["small and not immediately obvious","extremely large","completely imaginary","easy for everyone to notice"],0,"nuanced adjectives","Subtle describes something delicate or not obvious."],
        ["The new policy had a significant effect. Its effect was ___.",["important or considerable","almost impossible to measure","purely imaginary","unrelated to the policy"],0,"academic vocabulary","Significant means important or large enough to matter."],
        ["I overlooked a spelling mistake. I ___.",["failed to notice it","corrected it carefully","created it deliberately","explained it clearly"],0,"verb meaning","Overlook can mean fail to notice."],
        ["I came across an old photograph. I ___ it.",["found it by chance","created it recently","gave it away","looked at it every day"],0,"phrasal verbs","Come across means find or meet by chance."],
        ["These figures account for half of the total. They ___.",["make up half of it","explain why it is false","are missing from it","are larger than the total"],0,"academic collocations","Account for can mean constitute or make up."],
        ["The documentary presents a compelling argument. The argument is ___.",["convincing and persuasive","confusing and irrelevant","short but unsupported","unpleasant to watch"],0,"nuanced adjectives","Compelling means very convincing."],
        ["Some changes are inevitable. They are ___.",["certain to happen","easy to prevent","unlikely to occur","already forgotten"],0,"abstract vocabulary","Inevitable means certain to happen."]
      ],
      C1: [
        ["The instructions were ambiguous. They ___.",["could be understood in more than one way","were extremely detailed and clear","were impossible to read aloud","contained no written words"],0,"precision","Ambiguous means open to more than one interpretation."],
        ["She is meticulous about her research. She is ___.",["extremely careful about details","careless with evidence","quick to abandon tasks","uninterested in accuracy"],0,"precision","Meticulous means very careful and precise."],
        ["The scandal could undermine public trust. It could ___.",["weaken it gradually","restore it immediately","measure it accurately","make it unnecessary"],0,"abstract verbs","Undermine means weaken or damage, often gradually."],
        ["Her explanation is plausible. It is ___.",["reasonable and believable","certainly proven","deliberately offensive","impossible to test"],0,"evaluation","Plausible means seeming reasonable or likely to be true."],
        ["The report scrutinises the evidence. It ___.",["examines it very closely","summarises it without reading","hides it from the public","replaces it with opinion"],0,"academic verbs","Scrutinise means examine carefully and critically."],
        ["The manager allocated funds to training. The manager ___.",["assigned funds for that purpose","borrowed funds from employees","removed all funding","counted the funds twice"],0,"academic verbs","Allocate means distribute or assign for a particular purpose."],
        ["The graph conveys a clear message. It ___.",["communicates that message","contradicts every result","conceals all information","collects the raw data"],0,"communication","Convey means communicate or express."],
        ["Without maintenance, the building began to deteriorate. It began to ___.",["become worse in condition","increase in value","change ownership","look exactly the same"],0,"abstract verbs","Deteriorate means become worse."]
      ],
      C2: [
        ["The report uses technical language to obfuscate the issue. It tries to ___.",["make the issue unclear","explain the issue simply","prove the issue is irrelevant","translate the issue accurately"],0,"rare vocabulary","Obfuscate means deliberately make something unclear."],
        ["The negotiator was intransigent. The negotiator was ___.",["unwilling to change their position","ready to compromise","uncertain about the facts","eager to withdraw"],0,"rare adjectives","Intransigent means unwilling to change one's views or demands."],
        ["Smartphones are ubiquitous in many cities. They are ___.",["found almost everywhere","used by very few people","about to disappear","difficult to manufacture"],0,"rare adjectives","Ubiquitous means present or found everywhere."],
        ["The fame proved ephemeral. It was ___.",["short-lived","permanent","widely disputed","carefully earned"],0,"rare adjectives","Ephemeral means lasting for a very short time."],
        ["His response was equivocal. It was ___.",["deliberately unclear or ambiguous","completely direct","strongly supportive","factually detailed"],0,"rare adjectives","Equivocal means open to more than one interpretation or deliberately noncommittal."],
        ["The recalcitrant student refused to follow any instruction. The student was ___.",["stubbornly resistant to authority","quietly cooperative","easily persuaded","deeply confused"],0,"rare adjectives","Recalcitrant means stubbornly disobedient or resistant."],
        ["The ostensible reason was cost, but the real motive was different. The ostensible reason was ___.",["the apparent reason","the proven hidden motive","the least important detail","the final consequence"],0,"rare adjectives","Ostensible means appearing or stated to be true, whether or not it is."],
        ["He gave the task only perfunctory attention. His attention was ___.",["done with minimal effort or care","thorough and thoughtful","enthusiastic and sustained","carefully documented"],0,"rare adjectives","Perfunctory means carried out with minimal effort or interest."]
      ]
    },
    grammar: {
      A1: [
        ["She ___ to school every day.",["go","goes","going","gone"],1,"present simple","With he, she, or it, add -s or -es in the present simple."],
        ["There ___ two books on the table.",["is","are","be","am"],1,"there is/are","Use 'are' with plural nouns."],
        ["I have ___ apple in my bag.",["a","an","the","some"],1,"articles","Use 'an' before a vowel sound."],
        ["They ___ football now.",["play","plays","are playing","played"],2,"present continuous","Use am/is/are + -ing for an action happening now."],
        ["He doesn't ___ coffee.",["likes","like","liking","liked"],1,"present simple negatives","After doesn't, use the base form of the verb."],
        ["The keys are ___ the table.",["on","at","between","from"],0,"prepositions","Use 'on' for something resting on a surface."],
        ["My brother ___ swim very well.",["can","cans","is can","does can"],0,"modal verbs","Can is followed by the base form and does not take -s."],
        ["This is ___ new bag.",["I","me","my","mine"],2,"possessive adjectives","Use 'my' before a noun."]
      ],
      A2: [
        ["We ___ to Samarkand last summer.",["go","have gone","went","were going"],2,"past simple","Use the past simple for a finished time in the past."],
        ["There isn't ___ milk in the fridge.",["some","many","any","a few"],2,"quantifiers","Any is common in negative sentences."],
        ["This book is ___ than the one I read last week.",["interesting","more interesting","most interesting","the more interesting"],1,"comparatives","Use 'more' with many longer adjectives."],
        ["I have lived here ___ 2020.",["for","since","during","from"],1,"present perfect time expressions","Use since with the starting point of a period."],
        ["If it rains tomorrow, we ___ at home.",["stayed","would stay","will stay","have stayed"],2,"first conditional","The first conditional uses present simple in the if-clause and will + verb in the result."],
        ["You ___ see a doctor if the pain continues.",["should","would","might to","must to"],0,"modals","Should gives advice and is followed by the base verb."],
        ["She is going to ___ a new phone.",["buys","buying","buy","bought"],2,"going to","Be going to is followed by the base form."],
        ["I was cooking when he ___ home.",["comes","came","has come","coming"],1,"past continuous and past simple","Use the past simple for the shorter action that interrupts an ongoing action."]
      ],
      B1: [
        ["I ___ this film twice, so I know the ending.",["saw","have seen","am seeing","had see"],1,"present perfect","Use the present perfect for life experience or a past action connected to now."],
        ["The report ___ yesterday afternoon.",["finished","was finished","has finishing","is finish"],1,"passive voice","The past simple passive is was/were + past participle."],
        ["The woman ___ lives next door is a doctor.",["which","whose","who","where"],2,"relative clauses","Use who for a person in a defining relative clause."],
        ["If I ___ more free time, I would learn Japanese.",["have","had","will have","would have"],1,"second conditional","The second conditional uses past simple in the if-clause."],
        ["He asked me where I ___.",["live","am living","lived","have lived"],2,"reported questions","Backshift the present simple to past simple in this reported question."],
        ["I enjoy ___ in the morning.",["run","to run","running","ran"],2,"gerunds","Enjoy is followed by a gerund (-ing form)."],
        ["She is used to ___ up early.",["get","getting","got","gets"],1,"be used to","Be used to is followed by a noun or gerund."],
        ["Despite ___ tired, he continued working.",["be","being","was","to be"],1,"linking expressions","Despite is followed by a noun or gerund, not a finite clause."]
      ],
      B2: [
        ["If they had left earlier, they ___ the train.",["would catch","would have caught","will have caught","had caught"],1,"third conditional","The third conditional describes an unreal past: if + past perfect, would have + past participle."],
        ["You ___ have told me; I could have helped.",["should","must","can","may"],0,"modal perfects","Should have expresses a past action that was advisable but did not happen."],
        ["By next June, she ___ here for ten years.",["works","will have worked","has worked","would work"],1,"future perfect","Use the future perfect for an action completed by a future time."],
        ["The proposal, ___ by the committee, was revised.",["rejecting","having rejected","which rejecting","which had rejected"],1,"participle clauses","Having been rejected would be the passive form; the active form here needs a subject. This item is intentionally replaced below."],
        ["Not only ___ late, but he also forgot the documents.",["he was","was he","he had","did he was"],1,"inversion","After fronted 'not only', invert the subject and auxiliary."],
        ["I wish I ___ so much time yesterday.",["didn't waste","haven't wasted","hadn't wasted","wouldn't waste"],2,"wish about the past","Use past perfect after wish to express regret about a past event."],
        ["The more you practise, ___ you become.",["the fluent","more fluent","the more fluent","most fluent"],2,"comparative structures","The pattern is the + comparative, the + comparative."],
        ["He denied ___ the confidential document.",["to see","see","having seen","saw"],2,"gerunds and perfect forms","Deny is followed by a gerund; having seen emphasises an earlier action."]
      ],
      C1: [
        ["Rarely ___ such a convincing argument.",["I have heard","have I heard","I heard","did I have heard"],1,"negative adverbial inversion","A fronted negative adverbial such as rarely requires subject–auxiliary inversion."],
        ["It is essential that every applicant ___ the form by Friday.",["completes","complete","completed","will complete"],1,"subjunctive","The mandative subjunctive uses the base form after essential that."],
        ["Had I known about the delay, I ___ an earlier train.",["would take","will take","would have taken","had taken"],2,"inverted conditionals","Had I known is an inversion of if I had known; the result uses would have + participle."],
        ["The data, ___ from several sources, were checked twice.",["collecting","collected","having collect","were collected"],1,"reduced relative clauses","Collected is a reduced passive relative clause: data which were collected."],
        ["No sooner ___ the meeting begun than the fire alarm rang.",["did","has","had","was"],2,"inversion with no sooner","Use no sooner + had + subject + past participle + than."],
        ["Were the company ___ its policy, costs might fall.",["change","to change","changed","changing"],1,"inverted conditionals","Were + subject + to-infinitive expresses a hypothetical condition."],
        ["She spoke as though she ___ the decision herself.",["makes","has made","had made","will make"],2,"unreal comparison","Past perfect can describe an unreal earlier situation after as though."],
        ["Little ___ that the decision would change everything.",["they knew","did they know","they had known","have they known"],1,"negative adverbial inversion","Little at the beginning of a clause triggers inversion."]
      ],
      C2: [
        ["Much as I ___ your point, I cannot support the proposal.",["appreciate","am appreciating","appreciated","will appreciate"],0,"concessive clauses","Much as means although, and is followed by a finite clause."],
        ["Had it not ___ for the delay, we would have arrived on time.",["be","being","been","was"],2,"inverted conditionals","Had it not been for is a formal way to say if it had not been for."],
        ["The report was so densely written that its central argument remained ___.",["obscure","obscuring","obscuredly","obscurity"],0,"adjective forms","Obscure is the adjective meaning difficult to understand or not clear."],
        ["Not until the final chapter ___ the motive revealed.",["the motive was","was the motive","the motive had","did the motive"],1,"inversion","Not until at the beginning requires inversion in the main clause."],
        ["The committee recommended that the proposal ___ revised before publication.",["is","be","was","will be"],1,"mandative subjunctive","The formal mandative subjunctive uses be, not is or was."],
        ["He is one of the few researchers who ___ the implications fully.",["grasps","grasp","has grasped","is grasping"],1,"agreement in relative clauses","Who refers to researchers, so the plural verb grasp is required."],
        ["Scarcely ___ the announcement been made when the market reacted.",["has","was","had","did"],2,"inversion with scarcely","Use scarcely + had + subject + past participle + when."],
        ["The contract, ___ in considerable haste, contained several ambiguities.",["drafting","drafted","having draft","was drafted"],1,"reduced passive clauses","Drafted is a reduced passive clause: which was drafted."]
      ]
    }
  };
  const bank = [];
  Object.keys(raw).forEach(skill => {
    Object.keys(raw[skill]).forEach(level => {
      raw[skill][level].forEach((item,index) => {
        bank.push({
          id: skill + '-' + level.toLowerCase() + '-' + String(index+1).padStart(2,'0'),
          skill, level, prompt:item[0], choices:item[1], answer:item[2],
          topic:item[3], explanation:item[4]
        });
      });
    });
  });
  root.ENG_ASSESSMENT_BANK = bank;
})(typeof window !== 'undefined' ? window : globalThis);
