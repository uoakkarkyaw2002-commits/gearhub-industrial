const deployedVersion=require('../package.json').version;
function effectiveRelease(announcement){
 return {version:deployedVersion,notes:announcement?.version===deployedVersion?announcement.notes:'GearHub '+deployedVersion+' shared web app',...(announcement?.version===deployedVersion&&announcement.publishedAt?{publishedAt:announcement.publishedAt}:{})};
}
module.exports={deployedVersion,effectiveRelease};
